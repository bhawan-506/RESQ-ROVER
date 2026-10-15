#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ESP32Servo.h>

// --- WI-FI ACCESS POINT CREDENTIALS ---
const char* ssid     = "RESQ-ROVER";
const char* password = "buildfest2026";

// --- WEBSERVER & WEBSOCKET ---
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// --- RADAR HARDWARE PINS ---
#define TRIG_PIN         5
#define ECHO_PIN         18
#define RADAR_SERVO_PIN  19
#define ESP_BATT_PIN     34  // Analog pin for ESP32 battery monitoring

// --- HARDWARE UART2 (To STM32) ---
#define RX2_PIN          16  // Connect to STM32 PA9 (TX1)
#define TX2_PIN          17  // Connect to STM32 PA10 (RX1)

HardwareSerial stmSerial(2);
Servo radarServo;

// --- STATE VARIABLES ---
String currentMode = "MANUAL";
int radarAngle     = 0;
int radarStep      = 10;
unsigned long lastRadarMove = 0;

float stmPitch   = 0.0f;
float stmRoll    = 0.0f;
int   stmBattery = 95;

// --- WEBSOCKET EVENT HANDLER ---
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
        data[len] = 0;
        String msg = (char*)data;

        // Mode Switching
        if (msg == "MODE:AUTO") {
            currentMode = "AUTO";
            stmSerial.println("MODE:AUTO");
        } else if (msg == "MODE:MANUAL") {
            currentMode = "MANUAL";
            stmSerial.println("MODE:MANUAL");
        }

        // Manual Driving Commands (W, A, S, D, STOP)
        if (currentMode == "MANUAL") {
            if (msg == "DRIVE:W")    stmSerial.println("DRIVE:FWD");
            else if (msg == "DRIVE:S") stmSerial.println("DRIVE:REV");
            else if (msg == "DRIVE:A") stmSerial.println("DRIVE:LEFT");
            else if (msg == "DRIVE:D") stmSerial.println("DRIVE:RIGHT");
            else if (msg == "DRIVE:STOP") stmSerial.println("DRIVE:STOP");
        }
    }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
             void *arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_DATA) {
        handleWebSocketMessage(arg, data, len);
    }
}

// --- RADAR SWEEP & BROADCAST ---
void sweepRadar() {
    unsigned long now = millis();
    if (now - lastRadarMove > 60) {
        lastRadarMove = now;

        radarAngle += radarStep;
        if (radarAngle >= 180 || radarAngle <= 0) {
            radarStep = -radarStep;
        }
        radarServo.write(radarAngle);

        // Ultrasonic Ping
        digitalWrite(TRIG_PIN, LOW);
        delayMicroseconds(2);
        digitalWrite(TRIG_PIN, HIGH);
        delayMicroseconds(10);
        digitalWrite(TRIG_PIN, LOW);

        long duration = pulseIn(ECHO_PIN, HIGH, 25000); // 25ms timeout (~4m limit)
        long distance = (duration == 0) ? 400 : (duration / 2) / 29.1;

        // Broadcast Radar Packet to Dashboard
        String json = "{\"type\":\"radar\",\"angle\":" + String(radarAngle) + ",\"distance\":" + String(distance) + "}";
        ws.textAll(json);

        // Autonomous Obstacle Avoidance Reaction
        if (currentMode == "AUTO" && distance > 0 && distance < 25) {
            stmSerial.println("DRIVE:STOP");
            delay(50);
            if (radarAngle > 90) {
                stmSerial.println("DRIVE:RIGHT");
            } else {
                stmSerial.println("DRIVE:LEFT");
            }
        }
    }
}

// --- TELEMETRY DISPATCH ---
void sendTelemetry() {
    static unsigned long lastTelem = 0;
    if (millis() - lastTelem > 250) {
        lastTelem = millis();

        // Read ESP32 battery level
        int rawADC = analogRead(ESP_BATT_PIN);
        int espBattery = map(rawADC, 1800, 2450, 0, 100);
        espBattery = constrain(espBattery, 5, 100);

        bool isStuck = (abs(stmPitch) > 25.0f || abs(stmRoll) > 25.0f);

        String json = "{";
        json += "\"type\":\"telemetry\",";
        json += "\"mode\":\"" + currentMode + "\",";
        json += "\"espBatt\":" + String(espBattery) + ",";
        json += "\"stmBatt\":" + String(stmBattery) + ",";
        json += "\"imu\":{\"pitch\":" + String(stmPitch, 1) + ",\"roll\":" + String(stmRoll, 1) + "},";
        json += "\"isStuck\":" + String(isStuck ? "true" : "false");
        json += "}";

        ws.textAll(json);
    }
}

void setup() {
    Serial.begin(115200);
    stmSerial.begin(115200, SERIAL_8N1, RX2_PIN, TX2_PIN);

    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    pinMode(ESP_BATT_PIN, INPUT);

    radarServo.setPeriodHertz(50);
    radarServo.attach(RADAR_SERVO_PIN, 500, 2400);
    radarServo.write(90);

    // Start SoftAP
    WiFi.softAP(ssid, password);
    Serial.print("Access Point started! IP address: ");
    Serial.println(WiFi.softAPIP()); // Default: 192.168.4.1

    // Attach WebSocket handler
    ws.onEvent(onEvent);
    server.addHandler(&ws);
    server.begin();
}

void loop() {
    ws.cleanupClients();
    sweepRadar();
    sendTelemetry();

    // Read Incoming Telemetry from STM32 (P:<pitch>,R:<roll>,B:<batt>)
    while (stmSerial.available() > 0) {
        String msg = stmSerial.readStringUntil('\n');
        msg.trim();
        if (msg.startsWith("P:")) {
            int rIdx = msg.indexOf(",R:");
            int bIdx = msg.indexOf(",B:");
            if (rIdx != -1 && bIdx != -1) {
                stmPitch   = msg.substring(2, rIdx).toFloat();
                stmRoll    = msg.substring(rIdx + 3, bIdx).toFloat();
                stmBattery = msg.substring(bIdx + 3).toInt();
            }
        }
    }
}
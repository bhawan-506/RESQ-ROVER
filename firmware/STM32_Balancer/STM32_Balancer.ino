#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Servo.h>
#include <math.h>

// --- PIN DEFINITIONS ---
#define SERVO1_PIN   PA0  // Front-Left Leveling Servo (60 deg)
#define SERVO2_PIN   PA1  // Rear-Center Leveling Servo (180 deg)
#define SERVO3_PIN   PA2  // Front-Right Leveling Servo (300 deg)

#define MOTOR_IN1    PA3  // Left Motors Forward
#define MOTOR_IN2    PA4  // Left Motors Backward
#define MOTOR_IN3    PA5  // Right Motors Forward
#define MOTOR_IN4    PA6  // Right Motors Backward

#define BATT_SENSE   PA7  // Battery voltage divider analog input

// --- HARDWARE OBJECTS ---
Adafruit_MPU6050 mpu;
Servo servo1;
Servo servo2;
Servo servo3;

// --- 3-RRS LINKAGE GEOMETRY (Adapted for stock white horn) ---
const float Rb = 40.0f;   // Radius of servo shafts from center (mm)
const float a  = 16.0f;   // Stock white servo horn length (mm)
const float b  = 36.0f;   // 3D printed coupler length (mm)
const float zs = 32.0f;   // Servo shaft height above base plate (mm)
const float Hn = 36.0f;   // Neutral height of ball centers above shafts (mm)
const float Rp = 66.0f;   // Radius of ball joints on upper platform (mm)
const float phis[3] = {
    60.0f  * (float)M_PI / 180.0f,
    180.0f * (float)M_PI / 180.0f,
    300.0f * (float)M_PI / 180.0f
};

// --- SYSTEM STATE ---
String currentMode = "MANUAL";
String driveState  = "STOP";
float currentPitch = 0.0f;
float currentRoll  = 0.0f;

// --- MOTOR CONTROL FUNCTIONS ---
void stopMotors() {
    digitalWrite(MOTOR_IN1, LOW);
    digitalWrite(MOTOR_IN2, LOW);
    digitalWrite(MOTOR_IN3, LOW);
    digitalWrite(MOTOR_IN4, LOW);
}

void driveForward() {
    digitalWrite(MOTOR_IN1, HIGH);
    digitalWrite(MOTOR_IN2, LOW);
    digitalWrite(MOTOR_IN3, HIGH);
    digitalWrite(MOTOR_IN4, LOW);
}

void driveReverse() {
    digitalWrite(MOTOR_IN1, LOW);
    digitalWrite(MOTOR_IN2, HIGH);
    digitalWrite(MOTOR_IN3, LOW);
    digitalWrite(MOTOR_IN4, HIGH);
}

void turnLeft() {
    digitalWrite(MOTOR_IN1, LOW);
    digitalWrite(MOTOR_IN2, HIGH);
    digitalWrite(MOTOR_IN3, HIGH);
    digitalWrite(MOTOR_IN4, LOW);
}

void turnRight() {
    digitalWrite(MOTOR_IN1, HIGH);
    digitalWrite(MOTOR_IN2, LOW);
    digitalWrite(MOTOR_IN3, LOW);
    digitalWrite(MOTOR_IN4, HIGH);
}

// --- 3-RRS INVERSE KINEMATICS ---
void calculate_3RRS_IK(float pitch_deg, float roll_deg, int servo_angles[3]) {
    pitch_deg = constrain(pitch_deg, -22.0f, 22.0f);
    roll_deg  = constrain(roll_deg,  -22.0f, 22.0f);

    float p_rad = pitch_deg * (float)M_PI / 180.0f;
    float r_rad = roll_deg  * (float)M_PI / 180.0f;

    float cp = cos(p_rad), sp = sin(p_rad);
    float cr = cos(r_rad), sr = sin(r_rad);

    float R11 = cp,  R12 = sp * sr, R13 = sp * cr;
    float R21 = 0,   R22 = cr,      R23 = -sr;
    float R31 = -sp, R32 = cp * sr, R33 = cp * cr;

    for (int i = 0; i < 3; i++) {
        float px0 = Rp * cos(phis[i]);
        float py0 = Rp * sin(phis[i]);
        float pz0 = 0.0f;

        float Px = R11 * px0 + R12 * py0 + R13 * pz0;
        float Py = R21 * px0 + R22 * py0 + R23 * pz0;
        float Pz = R31 * px0 + R32 * py0 + R33 * pz0 + (zs + Hn);

        float Sx = Rb * cos(phis[i]);
        float Sy = Rb * sin(phis[i]);
        float Sz = zs;

        float dx = Px - Sx;
        float dy = Py - Sy;
        float dz = Pz - Sz;

        float pu = dx * cos(phis[i]) + dy * sin(phis[i]);
        float pz = dz;

        float d_sq = dx * dx + dy * dy + dz * dz;
        float K  = (d_sq + a * a - b * b) / (2.0f * a);
        float Rn = sqrt(pu * pu + pz * pz);

        float val = constrain(K / Rn, -1.0f, 1.0f);
        float theta_rad = atan2(pz, pu) - acos(val);

        servo_angles[i] = constrain(90 - (int)(theta_rad * 180.0f / (float)M_PI), 10, 170);
    }
}

// --- UART COMMAND PARSER (From ESP32) ---
void processIncomingCommand(String cmd) {
    cmd.trim();
    if (cmd == "MODE:AUTO") {
        currentMode = "AUTO";
        driveForward(); // Start autonomous patrol
    } else if (cmd == "MODE:MANUAL") {
        currentMode = "MANUAL";
        stopMotors();
    } else if (cmd == "DRIVE:FWD") {
        if (currentMode == "MANUAL") driveForward();
    } else if (cmd == "DRIVE:REV") {
        if (currentMode == "MANUAL") driveReverse();
    } else if (cmd == "DRIVE:LEFT") {
        if (currentMode == "MANUAL") turnLeft();
    } else if (cmd == "DRIVE:RIGHT") {
        if (currentMode == "MANUAL") turnRight();
    } else if (cmd == "DRIVE:STOP") {
        stopMotors();
    }
}

void setup() {
    Serial.begin(115200);   // Debug monitor
    Serial1.begin(115200);  // Serial1 (PA9 TX, PA10 RX) connected to ESP32

    pinMode(MOTOR_IN1, OUTPUT);
    pinMode(MOTOR_IN2, OUTPUT);
    pinMode(MOTOR_IN3, OUTPUT);
    pinMode(MOTOR_IN4, OUTPUT);
    pinMode(BATT_SENSE, INPUT);
    stopMotors();

    servo1.attach(SERVO1_PIN);
    servo2.attach(SERVO2_PIN);
    servo3.attach(SERVO3_PIN);
    servo1.write(90);
    servo2.write(90);
    servo3.write(90);

    Wire.begin(); // PB6=SCL, PB7=SDA
    if (!mpu.begin()) {
        Serial.println("MPU6050 initialization failed!");
    } else {
        mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
        mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    }
}

void loop() {
    // 1. Read UART Commands from ESP32
    while (Serial1.available() > 0) {
        String line = Serial1.readStringUntil('\n');
        processIncomingCommand(line);
    }

    // 2. Read MPU6050 Accelerometer
    sensors_event_t a_ev, g_ev, temp;
    mpu.getEvent(&a_ev, &g_ev, &temp);

    currentPitch = -(atan2(a_ev.acceleration.x, sqrt(a_ev.acceleration.y * a_ev.acceleration.y + a_ev.acceleration.z * a_ev.acceleration.z)) * 180.0f) / (float)M_PI;
    currentRoll  =  (atan2(a_ev.acceleration.y, a_ev.acceleration.z) * 180.0f) / (float)M_PI;

    // Safety cut-off: Stop motors if tilted beyond 25°
    if (abs(currentPitch) > 25.0f || abs(currentRoll) > 25.0f) {
        stopMotors();
    }

    // 3. Solve IK and update leveling servos
    int servo_angles[3];
    calculate_3RRS_IK(currentPitch, currentRoll, servo_angles);
    servo1.write(servo_angles[0]);
    servo2.write(servo_angles[1]);
    servo3.write(servo_angles[2]);

    // 4. Send Telemetry to ESP32 every 100ms
    static unsigned long lastTelemetry = 0;
    if (millis() - lastTelemetry > 100) {
        lastTelemetry = millis();

        // Calculate STM32 battery percentage (Scaled from 12V 3S LiPo or 2S battery pack)
        int rawADC = analogRead(BATT_SENSE);
        int batteryPct = map(rawADC, 2400, 3100, 0, 100);
        batteryPct = constrain(batteryPct, 5, 100);

        // Format: P:<pitch>,R:<roll>,B:<battery>
        Serial1.print("P:");
        Serial1.print(currentPitch, 1);
        Serial1.print(",R:");
        Serial1.print(currentRoll, 1);
        Serial1.print(",B:");
        Serial1.println(batteryPct);
    }

    delay(20); // 50 Hz control loop
}
# RESQ-ROVER Dual-Core Firmware

This folder contains the PlatformIO projects for both microcontrollers used in the rover. 

## 🛠️ Requirements
* **VS Code** with the **PlatformIO IDE** extension installed.
* **STM32 ST-Link V2 Programmer** (for flashing the BluePill).
* **Micro-USB Cable** (for flashing the ESP32).

## 1. STM32 Balancer (Physics & Motors)
1. Open the `STM32_Balancer` folder in PlatformIO.
2. Connect your ST-Link V2 to the STM32 (`3.3V`, `GND`, `SWCLK`, `SWDIO`).
3. Click the **PlatformIO: Upload** button (the right-arrow icon at the bottom of VS Code).
*Note: PlatformIO will automatically download the Adafruit MPU6050 libraries defined in the `platformio.ini` file.*

## 2. ESP32 Brain (Radar & WebSockets)
1. Open the `ESP32_Brain` folder in PlatformIO.
2. Connect the ESP32 to your PC via Micro-USB.
3. Click **PlatformIO: Upload**. 
*Note: If the ESP32 fails to connect during the "Connecting..." phase, hold the `BOOT` button on the ESP32 board until the flashing begins.*

## ⚠️ Serial UART Bridge (Crucial)
Once both boards are flashed, they must be wired together to communicate:
* **ESP32 GPIO 17 (TX2)** ➔ **STM32 PA10 (RX1)**
* **ESP32 GPIO 16 (RX2)** ➔ **STM32 PA9 (TX1)**
* **ESP32 GND** ➔ **STM32 GND** (If you skip this, no data will transfer!)
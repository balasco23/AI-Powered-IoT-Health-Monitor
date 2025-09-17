#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// WiFi credentials
#define WIFI_SSID "Starlite Network"
#define WIFI_PASSWORD "Starlite7"

// Firebase configuration
#define API_KEY "AIzaSyDTywgeZrMMIVMXnj-I_34jGslmnD-brsI"
#define DATABASE_URL "https://patient-health-app-a48bc-default-rtdb.firebaseio.com/"
#define USER_EMAIL "balasco235@gmail.com"
#define USER_PASSWORD "S0l0w33zy"

// DS18B20 Configuration
const int oneWireBus = 2; // GPIO2 (D4)
OneWire oneWire(oneWireBus);
DallasTemperature tempSensor(&oneWire);

// MAX30102 Configuration
MAX30105 heartSensor;
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg;

// Temperature storage
float currentTempC = 0;
float currentTempF = 0;
bool tempValid = false;

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Upload timing
unsigned long lastUpload = 0;
const unsigned long uploadInterval = 30000;
bool firebaseReady = false;

// LED and Button Configuration
const int redLED = 14;
const int yellowLED = 12;
const int greenLED = 13;
const int pushButton = 0;

bool systemActive = false;
bool lastButtonState = LOW;
bool currentButtonState = LOW;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;

bool heartSensorWorking = false;
bool tempSensorWorking = false;
unsigned long lastHeartReading = 0;
unsigned long lastTempReading = 0;
const unsigned long sensorTimeout = 10000;

void setup() {
  Serial.begin(115200);
  Serial.println("\nESP8266 Dual Sensor with Firebase Initialization");

  pinMode(redLED, OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(pushButton, INPUT_PULLUP);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  unsigned long wifiTimeout = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiTimeout < 20000) {
    delay(500);
    Serial.print(".");
    yield();
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed!");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Initializing Firebase...");
    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    auth.user.email = USER_EMAIL;
    auth.user.password = USER_PASSWORD;
    config.token_status_callback = tokenStatusCallback;
    config.time_zone = 0; // UTC

    fbdo.setResponseSize(4096);
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    Firebase.RTDB.setReadTimeout(&fbdo, 1000 * 60);
    Firebase.RTDB.setwriteSizeLimit(&fbdo, "small");

    // Wait for Firebase to be ready
    Serial.println("Waiting for Firebase to be ready...");
    unsigned long start = millis();
    while (!Firebase.ready() && millis() - start < 15000) {
      delay(100);
      yield();
    }

    firebaseReady = Firebase.ready();
    if (firebaseReady) {
      Serial.println("Firebase is ready.");
    } else {
      Serial.println("Firebase failed to initialize.");
    }
  }

  tempSensor.begin();
  Serial.print("Temperature sensors found: ");
  Serial.println(tempSensor.getDeviceCount());

  if (!heartSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found. Please check wiring/power.");
    while (1) {
      digitalWrite(redLED, HIGH);
      delay(500);
      digitalWrite(redLED, LOW);
      delay(500);
      yield();
    }
  }

  heartSensor.setup();
  heartSensor.setPulseAmplitudeRed(0x0A);
  heartSensor.setPulseAmplitudeGreen(0);
  readTemperature();
  updateLEDStatus();
  Serial.println("System ready! Press button to start/stop monitoring.");
}

void loop() {
  yield();
  handleButton();

  if (systemActive) {
    static unsigned long lastTempRead = 0;
    if (millis() - lastTempRead >= 5000) {
      lastTempRead = millis();
      readTemperature();
    }

    processHeartSensor();
    updateLEDStatus();

    if (WiFi.status() == WL_CONNECTED) {
      firebaseReady = Firebase.ready();
      if (millis() - lastUpload >= uploadInterval && firebaseReady) {
        uploadToFirebase();
        lastUpload = millis();
      }
    } else {
      firebaseReady = false;
    }
  } else {
    digitalWrite(redLED, HIGH);
    digitalWrite(yellowLED, LOW);
    digitalWrite(greenLED, LOW);
  }

  static unsigned long lastReconnectAttempt = 0;
  if (WiFi.status() != WL_CONNECTED && millis() - lastReconnectAttempt >= 30000) {
    Serial.println("Attempting WiFi reconnection...");
    WiFi.reconnect();
    lastReconnectAttempt = millis();
  }
}

void handleButton() {
  int reading = digitalRead(pushButton);

  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading != currentButtonState) {
      currentButtonState = reading;
      if (currentButtonState == LOW) {
        systemActive = !systemActive;

        if (systemActive) {
          Serial.println("=== SYSTEM STARTED ===");
          heartSensorWorking = false;
          tempSensorWorking = false;
          lastHeartReading = 0;
          lastTempReading = 0;
          readTemperature();
          updateLEDStatus();
        } else {
          Serial.println("=== SYSTEM STOPPED ===");
          digitalWrite(redLED, HIGH);
          digitalWrite(yellowLED, LOW);
          digitalWrite(greenLED, LOW);
        }
      }
    }
  }

  lastButtonState = reading;
}

void processHeartSensor() {
  long irValue = heartSensor.getIR();

  if (irValue > 50000) {
    heartSensorWorking = true;
    lastHeartReading = millis();
  } else if (millis() - lastHeartReading > sensorTimeout) {
    heartSensorWorking = false;
  }

  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++)
        beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }
  }

  Serial.print("IR="); Serial.print(irValue);
  if (irValue < 50000) Serial.print(" | No finger");
  else {
    Serial.print(" | BPM="); Serial.print(beatsPerMinute);
    Serial.print(" | Avg BPM="); Serial.print(beatAvg);
  }
  if (tempValid) {
    Serial.print(" | Temp: "); Serial.print(currentTempC);
    Serial.print("°C ("); Serial.print(currentTempF); Serial.print("°F)");
  } else Serial.print(" | Temp: Error");
  Serial.print(" | WiFi: "); Serial.print(WiFi.status() == WL_CONNECTED ? "OK" : "Failed");
  Serial.print(" | Firebase: "); Serial.print(firebaseReady ? "Ready" : "Not Ready");
  Serial.println();
  delay(50);
}

void readTemperature() {
  tempSensor.requestTemperatures();
  currentTempC = tempSensor.getTempCByIndex(0);
  if (currentTempC == DEVICE_DISCONNECTED_C) {
    tempValid = false;
    if (millis() - lastTempReading > sensorTimeout)
      tempSensorWorking = false;
  } else {
    tempValid = true;
    tempSensorWorking = true;
    lastTempReading = millis();
    currentTempF = DallasTemperature::toFahrenheit(currentTempC);
  }
}

void updateLEDStatus() {
  if (!systemActive) return;
  if (heartSensorWorking && tempSensorWorking) {
    digitalWrite(redLED, LOW);
    digitalWrite(yellowLED, LOW);
    digitalWrite(greenLED, HIGH);
  } else {
    digitalWrite(redLED, LOW);
    digitalWrite(yellowLED, HIGH);
    digitalWrite(greenLED, LOW);
  }
}

void uploadToFirebase() {
  if (!firebaseReady) {
    Serial.println("Firebase not ready for upload");
    return;
  }

  Serial.println("Uploading to Firebase...");
  unsigned long timestamp = millis();
  String timestampStr = String(timestamp);

  FirebaseJson json;
  json.set("timestamp", timestamp);
  json.set("temperature_celsius", currentTempC);
  json.set("temperature_fahrenheit", currentTempF);
  json.set("heart_rate_bpm", beatsPerMinute);
  json.set("heart_rate_avg", beatAvg);
  json.set("temp_valid", tempValid);
  json.set("wifi_rssi", WiFi.RSSI());

  String path = "sensor_data/" + timestampStr;

  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
    Serial.println("\u2713 Data uploaded to Firebase successfully");
    Serial.print("Path: "); Serial.println(path);
  } else {
    Serial.println("\u2717 Firebase upload failed");
    Serial.print("Reason: "); Serial.println(fbdo.errorReason());
  }

  if (Firebase.RTDB.setJSON(&fbdo, "current_readings", &json)) {
    Serial.println("\u2713 Current readings updated");
  } else {
    Serial.println("\u2717 Current readings update failed");
  }

  yield();
}

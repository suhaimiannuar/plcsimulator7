# Field Devices - 3D Components

## Overview

Added three essential field device components to the 3D model system:
1. **Push Button** - User input device
2. **Motor** - 3-phase induction motor
3. **LED Indicator** - Visual status indicator

## Components

### 1. Push Button (PushButton)

**Description:** Industrial push button with normally open (NO) and normally closed (NC) contacts.

**Physical Specifications:**
- Dimensions: 30mm × 30mm × 40mm
- Mount Type: Panel mounting
- Voltage: 24V DC
- Contacts: 2× NO, 1× NC, 1× COM

**Visual Design:**
- Cylindrical housing (dark gray)
- Dome-shaped button cap (colored)
- Terminal indicators at back
- Emissive glow when pressed

**Available Colors:**
- Red (0xff0000) - Default, typically for Stop/Emergency
- Green (0x00ff00) - Start/Run
- Yellow (0xffff00) - Reset/Acknowledge
- Blue (0x0000ff) - General purpose
- White (0xffffff) - General purpose

**Button Types:**
- **Momentary** - Returns to off when released
- **Latching** - Stays on until pressed again

**Usage:**
```javascript
// Add red momentary button
const stopButton = modelScene.addFieldDevice('button', {
    x: 100, y: 50, z: 0
}, {
    color: 0xff0000,
    buttonType: 'momentary'
});

// Press and release
stopButton.press();    // Activate contacts
stopButton.release();  // Deactivate (momentary only)

// For latching buttons
stopButton.toggle();   // Switch state
```

**State Management:**
```javascript
button.isPressed           // true/false
button.contactStates.NO1   // Normally open 1
button.contactStates.NO2   // Normally open 2
button.contactStates.NC1   // Normally closed 1
button.contactStates.COM   // Common terminal
```

---

### 2. Motor (Motor)

**Description:** 3-phase AC induction motor with mounting base and terminal box.

**Physical Specifications:**
- Dimensions: 150mm × 200mm × 150mm
- Mount Type: Floor/base mounting
- Power: 1.5kW (customizable)
- Speed: 1440 RPM (4-pole)
- Voltage: 400V 3-phase
- Terminals: U, V, W (phases) + PE (ground)

**Visual Design:**
- Cylindrical motor body (dark gray)
- Protruding shaft with rotation animation
- Cooling fins (decorative rings)
- Mounting base plate
- Terminal connection box on side
- Power rating label

**Usage:**
```javascript
// Add 1.5kW motor
const motor = modelScene.addFieldDevice('motor', {
    x: 200, y: 100, z: 0
}, {
    power: 1500  // Watts
});

// Control motor
motor.start();              // Start running at 100% speed
motor.stop();               // Stop motor
motor.setSpeed(75);         // Set to 75% speed
motor.reverse();            // Reverse direction

// Motor state
motor.isRunning            // true/false
motor.speed                // 0-100%
motor.direction            // 'forward' or 'reverse'
motor.rotationAngle        // Current rotation (animated)
```

**Animation:**
Motor shaft rotates when running. Rotation speed is calculated based on:
- Motor RPM rating
- Current speed percentage
- Direction (forward/reverse)

---

### 3. LED Indicator (LEDIndicator)

**Description:** Panel-mount LED indicator light with transparent lens.

**Physical Specifications:**
- Dimensions: 22mm × 22mm × 35mm
- Mount Type: Panel mounting
- Voltage: 24V DC
- Power: <1W
- Terminals: + (power), - (ground)

**Visual Design:**
- Cylindrical housing (dark gray)
- Transparent dome lens (colored)
- Emissive glow when ON
- Point light for realistic illumination
- Terminal indicators at back

**Available Colors:**
- Red - Fault/Error/Stop
- Green - Running/OK/Ready
- Yellow - Warning/Standby
- Blue - Process active
- White - General purpose

**Usage:**
```javascript
// Add green LED
const runningLED = modelScene.addFieldDevice('led', {
    x: 150, y: 50, z: 0
}, {
    color: 'green'
});

// Control LED
runningLED.turnOn();              // Turn on
runningLED.turnOff();             // Turn off
runningLED.toggle();              // Switch state
runningLED.setBrightness(0.5);    // Dim to 50%

// Blinking
runningLED.startBlinking(500);    // Blink every 500ms
runningLED.stopBlinking();        // Stop blinking

// LED state
runningLED.isOn                   // true/false
runningLED.brightness             // 0.0 - 1.0
runningLED.isBlinking             // true/false
runningLED.ledColor               // 'red', 'green', etc.
```

**Effects:**
- Emissive material intensity changes with state
- Point light added when ON for realistic glow
- Smooth transitions between states

---

## Integration with Main App

### HTML Controls

Added unified component selector in 3D view:
```html
<select id="componentType">
    <optgroup label="Field Devices">
        <option value="button">Push Button</option>
        <option value="motor">Motor</option>
        <option value="led">LED Indicator</option>
    </optgroup>
</select>
<button id="addComponent">+ Add</button>
```

### Example Setup

The "Create Example Setup" now includes:
- **Start Button** (Green) - Position (-250, 50, 150)
- **Stop Button** (Red) - Position (-150, 50, 150)
- **Motor** (1.5kW) - Position (250, 100, 0)
- **Running LED** (Green, blinking) - Position (-50, 50, 150)
- **Fault LED** (Red) - Position (50, 50, 150)

### Testing

Use `test-3d.html` for isolated testing:
```javascript
testButton();  // Adds red button, auto-presses after 2s
testMotor();   // Adds motor, auto-starts after 2s
testLED();     // Adds green LED, starts blinking after 2s
```

---

## Configuration

All field devices are defined in `js/model/config.js`:

```javascript
PLC_COMPONENTS.PUSH_BUTTON
PLC_COMPONENTS.MOTOR_3PHASE
PLC_COMPONENTS.INDICATOR_LED
```

Classes are in `js/model/components/fieldDevices.js`:
- `PushButton` extends `PLCComponent`
- `Motor` extends `PLCComponent`
- `LEDIndicator` extends `PLCComponent`

---

## Future Enhancements

1. **Interactive Click** - Click button in 3D to press/release
2. **Wire Connections** - Visual wiring from field devices to PLC
3. **State Sync** - Sync field device states with ladder diagram I/O
4. **More Devices:**
   - Selector switches (2/3 position)
   - Proximity sensors
   - Relays and contactors
   - Emergency stop buttons
   - Buzzers/horns
   - Digital displays

5. **Animations:**
   - Motor vibration effect
   - LED fade in/out
   - Button spring-back animation

6. **Sounds:**
   - Button click sound
   - Motor hum when running
   - Relay click sounds

---

## API Quick Reference

### ModelScene Methods
```javascript
modelScene.addFieldDevice(type, position, options)
// type: 'button', 'motor', 'led'
// position: {x, y, z}
// options: device-specific configuration
```

### Push Button
```javascript
button.press()
button.release()
button.toggle()
button.isPressed
button.contactStates
```

### Motor
```javascript
motor.start()
motor.stop()
motor.setSpeed(0-100)
motor.reverse()
motor.isRunning
motor.speed
motor.direction
```

### LED Indicator
```javascript
led.turnOn()
led.turnOff()
led.toggle()
led.setBrightness(0-1)
led.startBlinking(intervalMs)
led.stopBlinking()
led.isOn
led.brightness
```

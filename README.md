# HRM Attendance App

A React Native (Expo) UI for an HR management app covering attendance tracking, leave requests, and reporting.

## Features

- **Login** — branded sign-in screen with ID/password authentication
- **Dashboard** — today's working time, check-in location, attendance summary, and working hours chart
- **Attendance** — live check-in/check-out with map view and attendance history list
- **Leave** — leave balance overview, leave request form, holiday calendar, and leave history
- **Report** — monthly attendance and working hours breakdown
- **Profile/Menu** — user profile and app settings

## Screenshots

| Dashboard & Attendance | Leave Management | App Overview |
|---|---|---|
| ![Dashboard and Attendance](https://github.com/user-attachments/assets/017d3c12-0ba3-4ed3-a57b-aeab9b78f1ab) | ![Leave Screen](https://github.com/user-attachments/assets/c9ef99b3-add1-4596-ab89-85697e9f417e) | ![Clock in/out](https://github.com/user-attachments/assets/117be1f0-98ae-476a-a1b1-fc16949c0c5a) |

## Tech Stack

- React Native
- Expo
- React Navigation (Bottom Tabs + Native Stack)
- Expo Vector Icons

## Project Structure

```
├── App.js
└── src
    ├── theme.js
    ├── components
    │   └── BarChart.js
    ├── navigation
    │   └── TabNavigator.js
    └── screens
        ├── LoginScreen.js
        ├── DashboardScreen.js
        ├── AttendanceScreen.js
        ├── LeaveScreen.js
        ├── ReportScreen.js
        └── ProfileScreen.js
```

## Getting Started

```bash
npm install
npx expo start
```

## License

MIT

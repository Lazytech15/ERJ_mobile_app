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
| ![Dashboard and Attendance](./screenshots/screenshot-1.png) | ![Leave Screen](./screenshots/screenshot-2.png) | ![App Overview](./screenshots/screenshot-3.png) |

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

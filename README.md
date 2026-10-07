# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## הסבר על מבנה האפליקציה
באפליקציה שלנו, המידע על הסדרה שנבחרה נשמר באמצעות State בתוך רכיב האב הראשי (למשל, App.jsx). הלחיצה על סדרה ספציפית ברשימה מפעילה פונקציה שמעדכנת את ה-State המקומי עם פרטי הסדרה או מזהה הסדרה. לאחר שה-State מתעדכן, React מזהה את השינוי ומרנדר מחדש את המסך. המידע על הסדרה הנבחרת מועבר למטה (down) אל רכיב פאנל הפרטים באמצעות Props. בדרך זו, פאנל הפרטים רק מקבל את הנתונים המעודכנים כקלט פסיבי ומציג אותם (כמו התקציר, הדירוג והז'אנרים) ללא צורך לנהל את המידע בעצמו.
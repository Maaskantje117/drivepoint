# DRIVEPOINT

## Локальные ресурсы

- `src/assets/images/drivepoint-hero-mobile.webp` — облегчённая мобильная версия того же Hero-изображения.
- Manrope и Space Grotesk подключаются локально из `src/assets/fonts` в формате WOFF2.
- Лицензии шрифтов OFL 1.1 сохранены рядом с файлами: `OFL-Manrope.txt` и `OFL-SpaceGrotesk.txt`.

Демонстрационный одностраничный сайт вымышленного автосервиса. Проект собран на чистых HTML5, CSS3, Vanilla JavaScript и Vite — без React и тяжёлых UI-библиотек.

## Запуск

```bash
npm install
npm run dev
```

Локально сайт открывается по адресу `http://localhost:5173/drivepoint/`.

Для production-сборки:

```bash
npm run build
npm run preview
```

## GitHub Pages

Репозиторий должен называться `drivepoint`, а GitHub Pages — работать из Actions. Workflow `.github/workflows/deploy.yml` устанавливает зависимости через `npm ci`, собирает `dist` и публикует его при push в `main`.

## Структура

- `index.html` — семантическая разметка страницы и SEO-метаданные.
- `src/base.css` — основной адаптивный стиль, переменные и состояния.
- `src/styles.css` — точка подключения стилей для Vite.
- `src/main.js` — мобильное меню, аккордеон FAQ, плавная навигация и анимации появления.

Телефон, адрес, цены и формулировки явно демонстрационные и должны быть заменены перед коммерческим запуском.

## Изображения

Фотографии сохранены локально в `src/assets/images` в формате WebP:

- `drivepoint-hero.webp` — источник: [Unsplash photo-1486262715619-67b85e0b08d3](https://unsplash.com/photos/1486262715619-67b85e0b08d3).
- `drivepoint-about.webp` — источник: [Unsplash photo-1503376780353-7e6692767b70](https://unsplash.com/photos/1503376780353-7e6692767b70).

Изображения используются как демонстрационные материалы по [Unsplash License](https://unsplash.com/license). Перед коммерческой публикацией стоит подтвердить актуальные условия лицензии и при необходимости добавить атрибуцию автора.

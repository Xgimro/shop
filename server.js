const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 

app.use(session({
    secret: 'your secret key', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = []; 
    }
    next();
});

// Загрузка данных о товарах из JSON файла
let allProducts = [];
try {
    const data = fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8');
    allProducts = JSON.parse(data);
} catch (err) {
    console.error("Ошибка чтения файла products.json:", err);
}

// Главная страница (каталог товаров) с поиском и фильтрацией
app.get('/', (req, res) => {
    let filteredProducts = [...allProducts];
    const query = req.query.search || '';
    const categoryFilter = req.query.category || '';
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Infinity;

    // Поиск по названию (без учета регистра)
    if (query) {
        filteredProducts = filteredProducts.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Фильтрация по категории
    if (categoryFilter) {
        filteredProducts = filteredProducts.filter(p => p.category === categoryFilter);
    }

    // Фильтрация по цене
    filteredProducts = filteredProducts.filter(p => p.price >= minPrice && p.price <= maxPrice);

    res.render('index', {
        products: filteredProducts,
        allProducts: allProducts, 
        query: query,
        filters: req.query 
    });
});

// Добавление товара в корзину
app.post('/cart/add', (req, res) => {
    const productId = parseInt(req.body.productId);
    const productToAdd = allProducts.find(p => p.id === productId);

    if (productToAdd) {
        const cartItem = req.session.cart.find(item => item.id === productId);
        if (cartItem) {
            // Если товар уже есть в корзине, увеличиваем количество
            cartItem.quantity += 1;
        } else {
            // Если товара нет, добавляем его с количеством 1
            req.session.cart.push({ ...productToAdd, quantity: 1 });
        }
    } else {
        console.warn(`Попытка добавить несуществующий товар с ID: ${productId}`);
    }
    res.redirect('/');
});

// Страница корзины
app.get('/cart', (req, res) => {
    const cart = req.session.cart || []; // Получаем корзину из сессии
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.render('cart', { cart: cart, total: total });
});

// Удаление товара из корзины
app.post('/cart/remove', (req, res) => {
    const productId = parseInt(req.body.productId);
    req.session.cart = req.session.cart.filter(item => item.id !== productId);
    res.redirect('/cart');
});

app.get('/checkout', (req, res) => {
    const cart = req.session.cart || []; 
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.render('checkout', { cart: cart, total: total });

});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});

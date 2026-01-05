# Backend - Portfolio Tracker API

API REST construida con Flask + SQLAlchemy + SQLite para el tracking de inversiones.

## 🚀 Inicio Rápido

### 1. Crear entorno virtual

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # En Mac/Linux
# o en Windows: venv\Scripts\activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

El archivo `.env` ya está creado con tu API key de Gemini. Puedes modificarlo si es necesario.

### 4. Inicializar base de datos (opcional)

```bash
python init_db.py
```

Esto crea portfolios de ejemplo para probar.

### 5. Ejecutar servidor

```bash
python app.py
```

El servidor estará en: `http://localhost:5000`

---

## 📡 Endpoints Disponibles

### Health Check
```
GET /api/health
```

### Chat con Gemini (API Key oculta)
```
POST /api/chat
Body: { "message": "Tu pregunta", "mode": "normie", "context": "..." }
```

### Historial de Chat
```
GET /api/chat/history
DELETE /api/chat/history
```

### Portfolios
```
GET    /api/portfolios              # Listar todos
POST   /api/portfolios              # Crear nuevo
GET    /api/portfolios/:id          # Obtener uno
PUT    /api/portfolios/:id          # Actualizar
DELETE /api/portfolios/:id          # Eliminar
```

### Transacciones
```
GET    /api/portfolios/:id/transactions     # Listar transacciones
POST   /api/portfolios/:id/transactions     # Registrar nueva
DELETE /api/transactions/:id                # Eliminar
```

### Analytics
```
GET /api/portfolios/:id/analytics   # Estadísticas del portfolio
```

### Precios en Tiempo Real
```
GET /api/prices   # BTC, Gold, S&P 500
```

---

## 📊 Estructura de Base de Datos

```
portfolios
├── id
├── name
├── mode (normie/sovereign/custom)
├── initial_capital
├── monthly_contribution
├── expected_return
├── years_projection
├── is_active
├── created_at
└── updated_at

allocations
├── id
├── portfolio_id (FK)
├── asset_name
├── percentage
└── color

transactions
├── id
├── portfolio_id (FK)
├── asset_name
├── type (buy/sell/contribution)
├── amount
├── quantity
├── price_at_transaction
├── notes
├── date
└── created_at

chat_history
├── id
├── role (user/assistant)
├── content
├── mode
└── created_at
```

---

## 🔧 Integración con Frontend

Para conectar el frontend con este backend, actualiza las llamadas fetch en `index.html`:

```javascript
// En lugar de llamar directamente a Gemini:
const response = await fetch('http://localhost:5000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        message: text, 
        mode: currentMode,
        context: getContextPrompt() 
    })
});
const data = await response.json();
const aiText = data.response;
```

---

## 📁 Archivos

```
backend/
├── app.py           # Aplicación principal Flask
├── models.py        # Modelos SQLAlchemy
├── init_db.py       # Script de inicialización
├── requirements.txt # Dependencias
├── .env             # Variables de entorno (API keys)
├── .gitignore       # Archivos a ignorar
└── README.md        # Esta documentación
```

---

## 🔒 Seguridad

- La API key de Gemini está en `.env` y NO debe subirse a Git
- El archivo `.gitignore` ya excluye `.env` y `*.db`
- En producción, usa variables de entorno del servidor

---

## 🐛 Troubleshooting

### Error: "No module named flask"
```bash
pip install -r requirements.txt
```

### Error: "CORS blocked"
El servidor ya tiene CORS habilitado. Asegúrate de que el frontend use `http://localhost:5000`.

### Error: "Database locked"
Cierra otras conexiones a la base de datos (ej: si estás usando un cliente SQLite).

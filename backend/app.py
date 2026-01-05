"""
Portfolio Tracker API
Flask backend with SQLite database
"""

import os
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from models import db, Portfolio, Allocation, Transaction, ChatHistory

# Load environment variables
load_dotenv()

app = Flask(__name__)
# CORS configuration - allow frontend origins
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///portfolio.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

# Create tables on first run
with app.app_context():
    db.create_all()


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if API is running"""
    return jsonify({
        'status': 'ok',
        'message': 'Portfolio Tracker API is running',
        'timestamp': datetime.utcnow().isoformat()
    })


# =============================================================================
# GEMINI PROXY (Hides API Key)
# =============================================================================

@app.route('/api/chat', methods=['POST'])
def chat_with_gemini():
    """Proxy requests to Gemini API, hiding the API key from frontend"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        mode = data.get('mode', 'normie')
        context = data.get('context', '')
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            return jsonify({'error': 'API key not configured'}), 500
        
        # Build the prompt with context
        full_prompt = f"{context}\n\nPregunta: {user_message}"
        
        # Call Gemini API
        response = requests.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}',
            headers={'Content-Type': 'application/json'},
            json={
                'contents': [{
                    'parts': [{'text': full_prompt}]
                }]
            }
        )
        
        if response.status_code != 200:
            return jsonify({'error': 'Gemini API error', 'details': response.text}), 500
        
        result = response.json()
        ai_response = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', 'Sin respuesta')
        
        # Save to chat history
        user_chat = ChatHistory(role='user', content=user_message, mode=mode)
        ai_chat = ChatHistory(role='assistant', content=ai_response, mode=mode)
        db.session.add(user_chat)
        db.session.add(ai_chat)
        db.session.commit()
        
        return jsonify({
            'response': ai_response,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    """Get all chat history"""
    chats = ChatHistory.query.order_by(ChatHistory.created_at.asc()).all()
    return jsonify([c.to_dict() for c in chats])


@app.route('/api/chat/history', methods=['DELETE'])
def clear_chat_history():
    """Clear all chat history"""
    ChatHistory.query.delete()
    db.session.commit()
    return jsonify({'message': 'Chat history cleared'})


# =============================================================================
# PORTFOLIOS
# =============================================================================

@app.route('/api/portfolios', methods=['GET'])
def get_portfolios():
    """Get all portfolios"""
    portfolios = Portfolio.query.order_by(Portfolio.created_at.desc()).all()
    return jsonify([p.to_dict() for p in portfolios])


@app.route('/api/portfolios', methods=['POST'])
def create_portfolio():
    """Create a new portfolio"""
    data = request.get_json()
    
    portfolio = Portfolio(
        name=data.get('name', 'Mi Portfolio'),
        mode=data.get('mode', 'normie'),
        initial_capital=data.get('initial_capital', 0),
        monthly_contribution=data.get('monthly_contribution', 0),
        expected_return=data.get('expected_return', 8.0),
        years_projection=data.get('years_projection', 10)
    )
    
    db.session.add(portfolio)
    db.session.commit()
    
    # Add allocations if provided
    allocations = data.get('allocations', [])
    for alloc in allocations:
        allocation = Allocation(
            portfolio_id=portfolio.id,
            asset_name=alloc.get('asset_name'),
            percentage=alloc.get('percentage'),
            color=alloc.get('color', '#64748B')
        )
        db.session.add(allocation)
    
    db.session.commit()
    
    return jsonify(portfolio.to_dict()), 201


@app.route('/api/portfolios/<int:id>', methods=['GET'])
def get_portfolio(id):
    """Get a specific portfolio"""
    portfolio = Portfolio.query.get_or_404(id)
    return jsonify(portfolio.to_dict())


@app.route('/api/portfolios/<int:id>', methods=['PUT'])
def update_portfolio(id):
    """Update a portfolio"""
    portfolio = Portfolio.query.get_or_404(id)
    data = request.get_json()
    
    portfolio.name = data.get('name', portfolio.name)
    portfolio.mode = data.get('mode', portfolio.mode)
    portfolio.initial_capital = data.get('initial_capital', portfolio.initial_capital)
    portfolio.monthly_contribution = data.get('monthly_contribution', portfolio.monthly_contribution)
    portfolio.expected_return = data.get('expected_return', portfolio.expected_return)
    portfolio.years_projection = data.get('years_projection', portfolio.years_projection)
    
    db.session.commit()
    return jsonify(portfolio.to_dict())


@app.route('/api/portfolios/<int:id>', methods=['DELETE'])
def delete_portfolio(id):
    """Delete a portfolio"""
    portfolio = Portfolio.query.get_or_404(id)
    db.session.delete(portfolio)
    db.session.commit()
    return jsonify({'message': 'Portfolio deleted'})


# =============================================================================
# TRANSACTIONS
# =============================================================================

@app.route('/api/portfolios/<int:portfolio_id>/transactions', methods=['GET'])
def get_transactions(portfolio_id):
    """Get all transactions for a portfolio"""
    transactions = Transaction.query.filter_by(portfolio_id=portfolio_id).order_by(Transaction.date.desc()).all()
    return jsonify([t.to_dict() for t in transactions])


@app.route('/api/portfolios/<int:portfolio_id>/transactions', methods=['POST'])
def create_transaction(portfolio_id):
    """Record a new transaction"""
    Portfolio.query.get_or_404(portfolio_id)  # Verify portfolio exists
    data = request.get_json()
    
    transaction = Transaction(
        portfolio_id=portfolio_id,
        asset_name=data.get('asset_name'),
        type=data.get('type', 'buy'),
        amount=data.get('amount', 0),
        quantity=data.get('quantity', 0),
        price_at_transaction=data.get('price_at_transaction', 0),
        notes=data.get('notes'),
        date=datetime.fromisoformat(data['date']) if data.get('date') else datetime.utcnow()
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify(transaction.to_dict()), 201


@app.route('/api/transactions/<int:id>', methods=['DELETE'])
def delete_transaction(id):
    """Delete a transaction"""
    transaction = Transaction.query.get_or_404(id)
    db.session.delete(transaction)
    db.session.commit()
    return jsonify({'message': 'Transaction deleted'})


# =============================================================================
# ANALYTICS
# =============================================================================

@app.route('/api/portfolios/<int:portfolio_id>/analytics', methods=['GET'])
def get_portfolio_analytics(portfolio_id):
    """Get analytics for a portfolio"""
    portfolio = Portfolio.query.get_or_404(portfolio_id)
    transactions = Transaction.query.filter_by(portfolio_id=portfolio_id).all()
    
    # Calculate totals by asset
    assets = {}
    total_invested = 0
    
    for t in transactions:
        if t.asset_name not in assets:
            assets[t.asset_name] = {'invested': 0, 'quantity': 0}
        
        if t.type == 'buy':
            assets[t.asset_name]['invested'] += t.amount
            assets[t.asset_name]['quantity'] += t.quantity
            total_invested += t.amount
        elif t.type == 'sell':
            assets[t.asset_name]['invested'] -= t.amount
            assets[t.asset_name]['quantity'] -= t.quantity
    
    return jsonify({
        'portfolio_id': portfolio_id,
        'portfolio_name': portfolio.name,
        'total_invested': total_invested,
        'assets': assets,
        'transaction_count': len(transactions),
        'first_investment': transactions[-1].date.isoformat() if transactions else None,
        'last_investment': transactions[0].date.isoformat() if transactions else None
    })


# =============================================================================
# LIVE PRICES (Proxy for CORS issues)
# =============================================================================

# Simple in-memory cache to avoid hitting rate limits
_price_cache = {
    'data': None,
    'timestamp': None
}
CACHE_TTL = 30  # seconds

@app.route('/api/prices', methods=['GET'])
def get_live_prices():
    """Get live prices from CoinGecko - acts as CORS proxy"""
    from datetime import timedelta
    
    # Check cache first
    if _price_cache['data'] and _price_cache['timestamp']:
        cache_age = datetime.utcnow() - _price_cache['timestamp']
        if cache_age.total_seconds() < CACHE_TTL:
            return jsonify(_price_cache['data'])
    
    try:
        # Fetch all cryptos in one call
        response = requests.get(
            'https://api.coingecko.com/api/v3/simple/price',
            params={
                'ids': 'bitcoin,ethereum,solana,tether-gold',
                'vs_currencies': 'usd',
                'include_24hr_change': 'true'
            },
            timeout=10
        )
        
        if response.status_code == 429:
            # Rate limited - return cached data if available
            if _price_cache['data']:
                return jsonify(_price_cache['data'])
            return jsonify({'error': 'Rate limited', 'cached': False}), 429
        
        response.raise_for_status()
        data = response.json()
        
        result = {
            'bitcoin': {
                'price': data.get('bitcoin', {}).get('usd', 0),
                'change_24h': data.get('bitcoin', {}).get('usd_24h_change', 0)
            },
            'ethereum': {
                'price': data.get('ethereum', {}).get('usd', 0),
                'change_24h': data.get('ethereum', {}).get('usd_24h_change', 0)
            },
            'solana': {
                'price': data.get('solana', {}).get('usd', 0),
                'change_24h': data.get('solana', {}).get('usd_24h_change', 0)
            },
            'gold': {
                'price': data.get('tether-gold', {}).get('usd', 0),
                'change_24h': data.get('tether-gold', {}).get('usd_24h_change', 0)
            },
            'sp500': {
                'price': 6000,  # Placeholder - would need paid API for real S&P data
                'change_24h': 0.25
            },
            'timestamp': datetime.utcnow().isoformat(),
            'cached': False
        }
        
        # Update cache
        _price_cache['data'] = result
        _price_cache['timestamp'] = datetime.utcnow()
        
        return jsonify(result)
        
    except requests.exceptions.Timeout:
        if _price_cache['data']:
            cached = _price_cache['data'].copy()
            cached['cached'] = True
            return jsonify(cached)
        return jsonify({'error': 'Timeout fetching prices'}), 504
        
    except Exception as e:
        if _price_cache['data']:
            cached = _price_cache['data'].copy()
            cached['cached'] = True
            return jsonify(cached)
        return jsonify({'error': str(e)}), 500


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == '__main__':
    print("🚀 Starting Portfolio Tracker API...")
    print("📊 Database: portfolio.db")
    print("🔗 API running at: http://localhost:5000")
    print("📝 Endpoints:")
    print("   GET  /api/health - Health check")
    print("   POST /api/chat - Chat with Gemini")
    print("   GET  /api/portfolios - List portfolios")
    print("   POST /api/portfolios - Create portfolio")
    print("   GET  /api/prices - Live prices")
    print("-" * 50)
    
    app.run(debug=True, port=5000)

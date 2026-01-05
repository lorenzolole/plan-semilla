"""
Database Models for Portfolio Tracker
Using SQLAlchemy ORM with SQLite
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Portfolio(db.Model):
    """Represents a saved portfolio configuration"""
    __tablename__ = 'portfolios'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    mode = db.Column(db.String(20), nullable=False)  # 'normie', 'sovereign', 'custom'
    initial_capital = db.Column(db.Float, default=0)
    monthly_contribution = db.Column(db.Float, default=0)
    expected_return = db.Column(db.Float, default=8.0)
    years_projection = db.Column(db.Integer, default=10)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    allocations = db.relationship('Allocation', backref='portfolio', lazy=True, cascade='all, delete-orphan')
    transactions = db.relationship('Transaction', backref='portfolio', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'mode': self.mode,
            'initial_capital': self.initial_capital,
            'monthly_contribution': self.monthly_contribution,
            'expected_return': self.expected_return,
            'years_projection': self.years_projection,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'allocations': [a.to_dict() for a in self.allocations],
            'total_invested': sum(t.amount for t in self.transactions if t.type == 'buy'),
            'transaction_count': len(self.transactions)
        }


class Allocation(db.Model):
    """Represents asset allocation within a portfolio"""
    __tablename__ = 'allocations'
    
    id = db.Column(db.Integer, primary_key=True)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('portfolios.id'), nullable=False)
    asset_name = db.Column(db.String(50), nullable=False)
    percentage = db.Column(db.Float, nullable=False)  # 0-100
    color = db.Column(db.String(10), default='#64748B')
    
    def to_dict(self):
        return {
            'id': self.id,
            'asset_name': self.asset_name,
            'percentage': self.percentage,
            'color': self.color
        }


class Transaction(db.Model):
    """Represents a real investment transaction"""
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('portfolios.id'), nullable=False)
    asset_name = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # 'buy', 'sell', 'contribution'
    amount = db.Column(db.Float, nullable=False)  # Amount in UYU
    quantity = db.Column(db.Float, default=0)  # Units of asset (for BTC, shares, etc.)
    price_at_transaction = db.Column(db.Float, default=0)  # Price per unit at time of transaction
    notes = db.Column(db.Text, nullable=True)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'asset_name': self.asset_name,
            'type': self.type,
            'amount': self.amount,
            'quantity': self.quantity,
            'price_at_transaction': self.price_at_transaction,
            'notes': self.notes,
            'date': self.date.isoformat() if self.date else None
        }


class ChatHistory(db.Model):
    """Stores chat conversations with AI"""
    __tablename__ = 'chat_history'
    
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(10), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    mode = db.Column(db.String(20), default='normie')  # Context mode when message was sent
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'mode': self.mode,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

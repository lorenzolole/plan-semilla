"""
Initialize database with sample data
Run this script to set up the database with example portfolios
"""

from app import app, db
from models import Portfolio, Allocation, Transaction
from datetime import datetime, timedelta


def init_database():
    """Create tables and add sample data"""
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Check if we already have data
        if Portfolio.query.first():
            print("⚠️  Database already has data. Skipping initialization.")
            return
        
        print("📊 Creating sample portfolios...")
        
        # Portfolio 1: Normie Strategy
        normie = Portfolio(
            name="Mi Portfolio Clásico",
            mode="normie",
            initial_capital=45000,
            monthly_contribution=2000,
            expected_return=8.6,
            years_projection=10
        )
        db.session.add(normie)
        db.session.commit()
        
        # Allocations for Normie
        db.session.add(Allocation(portfolio_id=normie.id, asset_name="S&P 500", percentage=60, color="#10B981"))
        db.session.add(Allocation(portfolio_id=normie.id, asset_name="Fondo Liquidez", percentage=40, color="#3B82F6"))
        
        # Sample transactions for Normie
        db.session.add(Transaction(
            portfolio_id=normie.id,
            asset_name="S&P 500",
            type="buy",
            amount=27000,
            quantity=5.5,
            price_at_transaction=4900,
            notes="Compra inicial VOO",
            date=datetime.now() - timedelta(days=30)
        ))
        db.session.add(Transaction(
            portfolio_id=normie.id,
            asset_name="Fondo Liquidez",
            type="buy",
            amount=18000,
            notes="Suscripción Fondo Itaú",
            date=datetime.now() - timedelta(days=30)
        ))
        
        # Portfolio 2: Sovereign Strategy
        sovereign = Portfolio(
            name="Protocolo Fortaleza",
            mode="sovereign",
            initial_capital=45000,
            monthly_contribution=2000,
            expected_return=10.9,
            years_projection=10
        )
        db.session.add(sovereign)
        db.session.commit()
        
        # Allocations for Sovereign
        db.session.add(Allocation(portfolio_id=sovereign.id, asset_name="Bitcoin", percentage=35, color="#F59E0B"))
        db.session.add(Allocation(portfolio_id=sovereign.id, asset_name="S&P 500", percentage=45, color="#10B981"))
        db.session.add(Allocation(portfolio_id=sovereign.id, asset_name="Fondo Liquidez", percentage=20, color="#64748B"))
        
        # Sample transactions for Sovereign
        db.session.add(Transaction(
            portfolio_id=sovereign.id,
            asset_name="Bitcoin",
            type="buy",
            amount=15750,
            quantity=0.0025,
            price_at_transaction=6300000,
            notes="Compra BTC - auto-custodia",
            date=datetime.now() - timedelta(days=15)
        ))
        db.session.add(Transaction(
            portfolio_id=sovereign.id,
            asset_name="S&P 500",
            type="buy",
            amount=20250,
            quantity=4.1,
            price_at_transaction=4939,
            notes="VOO via eToro",
            date=datetime.now() - timedelta(days=15)
        ))
        
        db.session.commit()
        
        print("✅ Database initialized successfully!")
        print(f"   - Created {Portfolio.query.count()} portfolios")
        print(f"   - Created {Allocation.query.count()} allocations")
        print(f"   - Created {Transaction.query.count()} transactions")


if __name__ == '__main__':
    init_database()

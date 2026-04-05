#!/usr/bin/env python3
"""
Add sample inventory logs for testing
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.entities import InventoryLog, Medicine, User
from datetime import datetime, timedelta

def add_sample_inventory_logs():
    db = SessionLocal()
    try:
        # Get a medicine and user for testing
        medicine = db.query(Medicine).first()
        user = db.query(User).filter(User.role == "pharmacist").first()
        
        if not medicine or not user:
            print("Missing medicine or user for testing")
            return
            
        # Sample inventory logs
        logs = [
            InventoryLog(
                medicine_id=medicine.id,
                batch_id=None,
                user_id=user.id,
                action="import",
                quantity_change=100,
                quantity_before=0,
                quantity_after=100,
                reference_id=None,
                reference_type="manual_entry",
                notes="Nhập kho ban đầu",
                created_at=datetime.now() - timedelta(days=5)
            ),
            InventoryLog(
                medicine_id=medicine.id,
                batch_id=None,
                user_id=user.id,
                action="export",
                quantity_change=-10,
                quantity_before=100,
                quantity_after=90,
                reference_id=1,
                reference_type="prescription_dispense",
                notes="Xuất kho cho đơn thuốc #1",
                created_at=datetime.now() - timedelta(days=3)
            ),
            InventoryLog(
                medicine_id=medicine.id,
                batch_id=None,
                user_id=user.id,
                action="adjust",
                quantity_change=5,
                quantity_before=90,
                quantity_after=95,
                reference_id=None,
                reference_type="inventory_correction",
                notes="Điều chỉnh tồn kho sau kiểm kê",
                created_at=datetime.now() - timedelta(days=2)
            ),
            InventoryLog(
                medicine_id=medicine.id,
                batch_id=None,
                user_id=user.id,
                action="import",
                quantity_change=50,
                quantity_before=95,
                quantity_after=145,
                reference_id=1,
                reference_type="batch_import",
                notes="Nhập thêm lô thuốc từ nhà cung cấp",
                created_at=datetime.now() - timedelta(days=1)
            ),
            InventoryLog(
                medicine_id=medicine.id,
                batch_id=None,
                user_id=user.id,
                action="export",
                quantity_change=-20,
                quantity_before=145,
                quantity_after=125,
                reference_id=2,
                reference_type="prescription_dispense",
                notes="Xuất kho cho đơn thuốc #2",
                created_at=datetime.now() - timedelta(hours=6)
            )
        ]
        
        # Add logs to database
        for log in logs:
            db.add(log)
        
        db.commit()
        print(f"Added {len(logs)} sample inventory logs")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_sample_inventory_logs()

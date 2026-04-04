from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.entities import Appointment, AppointmentStatus, Doctor, Invoice, Medicine, PaymentStatus

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/revenue")
def revenue_report(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["admin", "pharmacist"])),
):
    query = db.query(Invoice).filter(Invoice.payment_status.in_([PaymentStatus.paid, PaymentStatus.credit_approved]))
    if date_from:
        query = query.filter(func.date(Invoice.created_at) >= date_from)
    if date_to:
        query = query.filter(func.date(Invoice.created_at) <= date_to)
    invoices = query.all()
    total = sum(float(item.total_amount) for item in invoices)
    paid = sum(float(item.paid_amount) for item in invoices)
    return {"count": len(invoices), "total_amount": total, "paid_amount": paid}


@router.get("/appointments")
def appointments_report(db: Session = Depends(get_db), current_user=Depends(require_role(["admin", "doctor"]))):
    total = db.query(Appointment).count()
    grouped = (
        db.query(Appointment.status, func.count(Appointment.id))
        .group_by(Appointment.status)
        .all()
    )
    return {
        "total": total,
        "by_status": {status.value if hasattr(status, "value") else str(status): count for status, count in grouped},
    }


@router.get("/inventory")
def inventory_report(db: Session = Depends(get_db), current_user=Depends(require_role(["admin", "pharmacist"]))):
    low_stock = db.query(Medicine).filter(Medicine.current_stock < Medicine.reorder_level).all()
    return {
        "low_stock": [
            {"id": item.id, "name": item.name, "current_stock": item.current_stock, "reorder_level": item.reorder_level}
            for item in low_stock
        ]
    }


@router.get("/dashboard")
def dashboard_report(
    target_date: date | None = Query(default=None),
    db: Session = Depends(get_db), 
    current_user=Depends(require_role(["admin", "pharmacist", "doctor", "patient"]))
):
    query_date = target_date or date.today()
    today_appointments = db.query(Appointment).filter(Appointment.appointment_date == query_date).count()
    total_doctors = db.query(Doctor).count()
    total_exam_days = db.query(func.count(func.distinct(Appointment.appointment_date))).scalar() or 0
    total_inventory = db.query(func.coalesce(func.sum(Medicine.current_stock), 0)).scalar() or 0
    total_fund = (
        db.query(func.coalesce(func.sum(Invoice.paid_amount), 0))
        .filter(Invoice.payment_status.in_([PaymentStatus.paid, PaymentStatus.credit_approved]))
        .scalar()
        or 0
    )
    waiting = db.query(Appointment).filter(Appointment.appointment_date == query_date, Appointment.status == AppointmentStatus.checked_in).count()
    in_progress = db.query(Appointment).filter(Appointment.appointment_date == query_date, Appointment.status == AppointmentStatus.in_progress).count()
    paid_today = (
        db.query(func.coalesce(func.sum(Invoice.paid_amount), 0))
        .filter(func.date(Invoice.created_at) == query_date)
        .scalar()
        or 0
    )
    low_stock = db.query(Medicine).filter(Medicine.current_stock < Medicine.reorder_level).count()
    return {
        "total_doctors": total_doctors,
        "total_exam_days": int(total_exam_days),
        "total_inventory": float(total_inventory),
        "total_fund": float(total_fund),
        "today_appointments": today_appointments,
        "waiting": waiting,
        "in_progress": in_progress,
        "paid_today": float(paid_today),
        "low_stock_count": low_stock,
    }

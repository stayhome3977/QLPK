# QLPK Da Lieu

Du an quan ly phong kham da lieu duoc scaffold tu tai lieu `cai-tien-phong-kham-da-lieu.md`.

## Cong nghe

- Backend: FastAPI + SQLAlchemy + JWT + ReportLab
- Frontend: React + Vite + Axios + React Router
- DB mac dinh: SQLite de khoi dong nhanh, co the doi sang MySQL qua `DATABASE_URL`

## Cau truc

- `backend/`: API, model, router, seed
- `frontend/`: giao dien cong cong va cong van hanh da vai tro
- `cai-tien-phong-kham-da-lieu.md`: tai lieu nghiep vu / pham vi

## Chay backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

API docs: `http://127.0.0.1:8000/docs`

## Chay frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

## Tai khoan demo

- `admin@qlpk.vn / Admin@123`
- `doctor@qlpk.vn / Doctor@123`
- `patient@qlpk.vn / Patient@123`
- `reception@qlpk.vn / Demo@123`
- `cashier@qlpk.vn / Demo@123`
- `pharmacist@qlpk.vn / Demo@123`

## Ghi chu

- Database duoc tao tu dong khi backend startup.
- Seed mac dinh tao sẵn admin, bac si, benh nhan, dich vu va cac tai khoan vai tro con lai.
- Frontend hien tai uu tien luong nghiep vu chinh: dat lich, benh an, don thuoc, hoa don, thanh toan va cap phat thuoc.

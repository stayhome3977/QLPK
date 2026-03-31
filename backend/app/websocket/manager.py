from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        if user_id in self.active_connections and websocket in self.active_connections[user_id]:
            self.active_connections[user_id].remove(websocket)

    async def send_personal_message(self, user_id: int, payload: dict) -> None:
        for connection in self.active_connections.get(user_id, []):
            await connection.send_json(payload)


manager = ConnectionManager()


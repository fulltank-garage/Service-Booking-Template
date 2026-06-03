package ws

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte, 256),
	}
}

func (hub *Hub) Run() {
	for {
		select {
		case client := <-hub.register:
			hub.clients[client] = true
		case client := <-hub.unregister:
			if hub.clients[client] {
				delete(hub.clients, client)
				close(client.send)
			}
		case message := <-hub.broadcast:
			for client := range hub.clients {
				select {
				case client.send <- message:
				default:
					delete(hub.clients, client)
					close(client.send)
				}
			}
		}
	}
}

func (hub *Hub) Broadcast(message []byte) {
	hub.broadcast <- message
}

func (hub *Hub) Serve(c *gin.Context, allowedOrigins []string) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" || len(allowedOrigins) == 0 {
				return true
			}
			for _, allowed := range allowedOrigins {
				if origin == allowed {
					return true
				}
			}
			return false
		},
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 32)}
	hub.register <- client
	go client.writePump()
	client.readPump()
}

func (client *Client) readPump() {
	defer func() {
		client.hub.unregister <- client
		_ = client.conn.Close()
	}()
	for {
		if _, _, err := client.conn.ReadMessage(); err != nil {
			break
		}
	}
}

func (client *Client) writePump() {
	defer func() {
		_ = client.conn.Close()
	}()
	for message := range client.send {
		if err := client.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			break
		}
	}
}

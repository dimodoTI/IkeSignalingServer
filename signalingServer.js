const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');

const server = https.createServer({
    key: fs.readFileSync('./certs/ws.video.ikeargentina.com.ar/key.pem'),
    cert: fs.readFileSync('./certs/ws.video.ikeargentina.com.ar/fullchain.pem')
});

const wssecure = new WebSocket.Server({
    server
});


//require our websocket library 
//const WebSocketServer = require('ws').Server;

//creating a websocket server at port 9090 
//const wss = new WebSocketServer({
//    port: 9090
//});

//all connected to the server users 
let users = {};

//when a user connects to our sever 
wssecure.on("connection", (connection) => {

    console.log("usuario conectado");

    connection.on('message', (message) => {

        let data;
        let conn;
        let conns;
        //accepting only JSON messages 
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }

        //switching type of the user message 
        switch (data.type) {
            //when a user tries to login 

            case "login":
                console.log(data.name + " logueado, Sala " + data.sala);


                let ok = true
                let full = false
                if (!users[data.sala]) {
                    users[data.sala] = {
                        [data.name]: connection
                    }
                } else {
                    if (!users[data.sala][data.name]) {
                        users[data.sala][data.name] = connection
                        full = true
                    } else {
                        ok = false
                    }
                }
                connection.name = data.name;
                connection.sala = data.sala;
                if (ok) {
                    console.log(connection.name + " se guardo");
                    sendTo(connection, {
                        type: "login",
                        full: full,
                        success: true
                    });
                } else {
                    console.log(connection.name + " ya registrado");
                    sendTo(connection, {
                        type: "login",
                        success: false
                    });

                }
                console.log(users)
                break;
            case "offer":
                //for ex. UserA wants to call UserB 
                console.log("Sending offer to: ", data.name);

                //if UserB exists then send him offer details 
                conns = users[data.sala];

                if (conns != null) {

                    conn = conns[data.name]

                    if (conn) {
                        sendTo(conn, {
                            type: "offer",
                            offer: data.offer,
                            name: connection.name
                        });
                    } else {
                        console.log("no existe " + data.name + " en la sala")
                    }
                }

                break;

            case "answer":
                console.log("Sending answer to: ", data.name);
                //for ex. UserB answers UserA 
                conns = users[data.sala];

                if (conns != null) {
                    conn = conns[data.name]
                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer
                    });
                }

                break;

            case "candidate":
                console.log("Sending candidate to:", data.name);

                conns = users[data.sala];

                if (conns != null) {
                    conn = conns[data.name]
                    if (conn) {
                        sendTo(conn, {
                            type: "candidate",
                            candidate: data.candidate
                        });
                    } else {
                        console.log("no existe candidate :", data.name);
                    }
                }

                break;

            case "leave":
                console.log("Disconnecting from", data.name);
                conns = users[data.sala];

                //notify the other user so he can disconnect his peer connection 
                if (conns != null) {
                    conn = conns[data.name]
                    if (conn) {
                        sendTo(conn, {
                            type: "leave"
                        });
                    } else {
                        console.log("no existe " + data.name + " no se puede ir")
                    }
                }


                break;

            default:
                sendTo(connection, {
                    type: "error",
                    message: "Command not found: " + data.type
                });

                break;
        }


        //when user exits, for example closes a browser window 
        //this may help if we are still in "offer","answer" or "candidate" state 

    })
    connection.on("close", () => {
        if (connection.name) {
            delete users[connection.sala][connection.name];
            console.log(connection.name + " se borro");

            if (Object.keys(users[connection.sala]).length == 0) {
                delete users[connection.sala]
                console.log("se borro la sala")
            }


        }
    });
})

const sendTo = (connection, message) => {
    connection.send(JSON.stringify(message));
}

server.listen(9090);
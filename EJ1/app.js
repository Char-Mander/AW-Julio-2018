"use strict";

const express = require("express");
const session = require("express-session");
const mysql = require("mysql");
const path = require("path");
const bodyParser = require("body-parser");
const expressValidator = require("express-validator")

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "ej1"
});

const middlewareSession = session({
    saveUninitialized: false,
    secret: "foobar34",
    resave: false
});

const app = express();

//Configuración de los ficheros estáticos
const ficherosEstaticos = path.join(__dirname, "public");
app.use(express.static(ficherosEstaticos));

//Configuración de las vistas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public", "views"));

//Configuración del body parser
app.use(bodyParser.urlencoded({ extended: true }));

//Configuración del express validator
app.use(expressValidator());

//Configuración de la sesión
app.use(middlewareSession);

class DAO {
    constructor(pool) {
        this.pool = pool;
    }

    obtenerTodasMesas(callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err, null);
            }
            else {
                let query = "SELECT * FROM mesas";
                connection.query(query, function (error, result) {
                    connection.release();
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        console.log("La consulta ha ido bien");
                        if (result.length > 0) {
                            callback(null, result);
                        }
                        else { callback(null, -1) }
                    }
                });
            }
        });
    }

    obtenerMesa(id, callback) {
        pool.getConnection(function (error, connection) {
            if (err) {
                callback(err, null);
            }
            else {
                let query = "SELECT * FROM mesas WHERE id = ?"
                connection.query(query, [id], function (error, resultado) {
                    if(error){
                        callback(err, null);
                    }
                    else{
                        callback(null, resultado[0]);
                    }
                });
            }
        });
    }

    obtenerMesaLibre(numComensales, callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err, null);
            }
            else {
                let query = "SELECT * FROM mesas WHERE comensales = 0 AND num_sillas >= ? ORDER BY num_sillas";

                connection.query(query, [numComensales], function (error, resultado) {
                    console.log("Resultado de la query del buscar sitio libre: " + resultado[0]);
                    let query2 = "UPDATE mesas SET comensales = ? WHERE id = ?";
                    let elems = [numComensales, resultado[0].id];
                    connection.query(query2, elems, function (error, resultado) {
                        connection.release();
                        if (error) {
                            callback(err, null);
                        }
                        else {
                            callback(null, resultado[0]);
                        }
                    })
                });
            }
        })
    }
}

const dao = new DAO(pool);


app.get("/", function (request, response) {
    // response.status(200);
    dao.obtenerTodasMesas(function (error, result) {
        if (error) {
            console.log("error");

        }
        else {
            let mesas = [];
            result.forEach(function (fila) {
                let objaux = {};
                objaux.id = fila.id;
                objaux.posicion = fila.posicion;
                if (Number(fila.comensales) > 0) {
                    objaux.reservada = "SI";
                }
                else {
                    objaux.reservada = "NO";
                }
                objaux.ocupacion = new Array(fila.num_sillas);

                for (let i = 0; i < objaux.ocupacion.length; i++) {
                    if (i + 1 <= Number(fila.comensales)) {
                        objaux.ocupacion[i] = "OCUPADO";
                    }
                    else {
                        objaux.ocupacion[i] = "LIBRE";
                    }
                }
                console.log(objaux);
                mesas.push(objaux);
            });
            console.log("Mesas lenght: " + mesas.length);
            response.render("mesas", { mesas: mesas });
        }
    })
});

app.post("/", function (request, response) {
    let nombre, numComensales;
    nombre = request.body.nombre;
    numComensales = request.body.reserva;
    if (nombre !== "" && numComensales !== "") {
        if (request.session.reservas === undefined) request.session.reservas = [];
        if (!request.session.reservas.some(n => n.nombre === nombre)) {
            let obj = {nombre: nombre, idReserva: ""};
            dao.obtenerMesaLibre(function(error, resultado){
                if(error){
                    console.log("Algo ha ido mal al hacer la reserva");
                }
                else{
                    obj.idReserva = resultado.id;
                    response.render("reservado", {reserva: resultado, nombre: nombre});
                }
            });
        }
        else {
            dao.obtenerMesa(function(error, resultado){
                if(error){
                    console.log("Algo ha ido mal");
                }
                else{
                    response.render("reservado", {reserva: resultado, nombre: nombre})
                }
            });
            
        }
    }
    else {
        response.status(500);
    }
})


app.listen(3000, function (err) {
    if (err) {
        console.error("No se pudo inicializar el servidor");
    } else {
        console.log("Servidor arrancado en el puerto 3000");
    }
});
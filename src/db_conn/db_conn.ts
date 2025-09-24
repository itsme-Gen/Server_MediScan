import mysql from 'mysql2/promise';

let conn = mysql.createPool({
    host:'localhost',
    user:'root',
    password:'',
    database:'hospital_data',
    connectionLimit: 10
    
})

async function testConnection(){
    try{
        const connection = await conn.getConnection()
        console.log("Connected Successfully")
        connection.release()
    }catch(error){
        console.error("Connection Unsuccesfull",error)
    }
}
testConnection()
export default conn;

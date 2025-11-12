const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const dotenv = require('dotenv');
dotenv.config();



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


//middlewares
app.use(cors())
app.use(express.json())



app.get('/', (req, res) => {
    res.send('FinEase Server is running');
});
async function run() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB!");

        const database = client.db("fineaseDB");
        const fineaseDB = database.collection("transactions");

        // ------------------ POST (Insert) ------------------
        app.post('/add-transactions', async (req, res) => {
            const data = req.body; // Can be object or array

            try {
                if (Array.isArray(data)) {
                    const result = await fineaseDB.insertMany(data);
                    res.status(201).send({
                        message: `${data.length} transactions added successfully.`,
                        result,
                    });
                } else {
                    const result = await fineaseDB.insertOne(data);
                    res.status(201).send({
                        message: "Single transaction added successfully.",
                        result,
                    });
                }
            } catch (error) {
                console.error("Insert Error:", error);
                res.status(500).send({ message: "Failed to insert transaction(s)", error });
            }
        });

        // ------------------ GET (Read) ------------------
        app.get('/my-transactions', async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.email = email;
            }
            const cursor = fineaseDB.find(query);
            const transactions = await cursor.toArray();
            res.send(transactions);

        });

        app.get('/transactions/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const transaction = await fineaseDB.findOne(query);
            res.send(transaction);
        });

        // ------------------ GET (Read with sorting) ------------------
        app.get('/my-transactions', async (req, res) => {
            try {
                const email = req.query.email;
                const sortBy = req.query.sortBy || 'date'; // default sort by date
                const order = req.query.order === 'asc' ? 1 : -1; // asc=1, desc=-1

                const query = {};
                if (email) {
                    query.email = email;
                }

                // Map frontend field names to MongoDB fields
                const sortField = sortBy === 'amount' ? 'amount' : 'date';

                const cursor = fineaseDB.find(query).sort({ [sortField]: order });
                const transactions = await cursor.toArray();

                res.send(transactions);
            } catch (error) {
                console.error("❌ Failed to fetch transactions:", error);
                res.status(500).send({ message: "Failed to fetch transactions", error });
            }
        });
        // ------------------ PUT (Update) ------------------
        app.put('/transactions/:id', async (req, res) => {
            const id = req.params.id;
            const updatedTransaction = req.body;

            try {
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        type: updatedTransaction.type,
                        category: updatedTransaction.category,
                        description: updatedTransaction.description,
                        amount: Number(updatedTransaction.amount),
                        date: updatedTransaction.date,
                    },
                };

                const result = await fineaseDB.updateOne(filter, updateDoc);

                if (result.modifiedCount === 0) {
                    return res.status(404).send({ message: "No transaction found or data unchanged." });
                }

                res.send({
                    message: "✅ Transaction updated successfully.",
                    result,
                });
            } catch (error) {
                console.error("Update Error:", error);
                res.status(500).send({ message: "❌ Failed to update transaction", error });
            }
        });



        // ------------------ Delete (Delete) ------------------

        app.delete('/transactions/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await fineaseDB.deleteOne(query);
            res.send(result);
        });

        // Ping to confirm connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged MongoDB successfully!");

    } catch (e) {
        console.error("❌ Connection Error:", e);
    }
}

run().catch(console.dir);


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

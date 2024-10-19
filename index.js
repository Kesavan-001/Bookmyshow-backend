const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const dotenv = require("dotenv").config();
const URL = process.env.DB;

const DB_NAME = "movies_db";

const COLLECTION_NAME = "movies";
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

app.get("/movie/get-movies", async (req, res) => {
  try {
    // Step 1. Connect the Database
    const client = new MongoClient(URL, {}).connect();

    // Step 2. Select the DB
    let db = (await client).db(DB_NAME);

    // Step 3. Select the Collection
    let collection = await db.collection(COLLECTION_NAME);

    // Step 4. Do the operation
    let movies = await collection.find({}).toArray();

    // Step 5. Close the connection
    (await client).close();

    res.json(movies);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.get("/movie/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Step 1. Connect the Database
    const client = new MongoClient(URL, {}).connect();

    // Step 2. Select the DB
    let db = (await client).db(DB_NAME);

    // Step 3. Select the Collection
    let dbcollection = await db.collection(COLLECTION_NAME);

    let movie = await dbcollection.findOne({ _id: new ObjectId(id) });

    (await client).close();

    res.json(movie);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.post("/movie/book-movie", async (req, res) => {
  let bookingRequest = req.body;

  if (
    !bookingRequest.movieId ||
    !bookingRequest.showId ||
    !bookingRequest.seats ||
    !bookingRequest.name ||
    !bookingRequest.email ||
    !bookingRequest.phoneNumber
  ) {
    return res.status(401).json({ message: "Some fields are missing" });
  }
  let requestedSeat = parseInt(bookingRequest.seats);

  // NaN -> Not a Number
  if (isNaN(requestedSeat) || requestedSeat <= 0) {
    return res.status(401).json({ message: "Invalid seat count" });
  }

  try {
    // Step 1. Connect to the Database
    const client = new MongoClient(URL, {}).connect();

    // Step 2. Select the DB
    let db = (await client).db(DB_NAME);

    // Step 3. Select the Collections
    let moviesCollection = await db.collection(COLLECTION_NAME);
    let bookingsCollection = await db.collection("bookings");

    // Find the movie

    let movie = await moviesCollection.findOne({
      _id: new ObjectId(bookingRequest.movieId),
    });

    if (!movie) {
      return res.status(404).json({ message: "Requested movie is not found" });
    }

    const show = Object.values(movie.shows)
      .flat()
      .find((s) => s.id === bookingRequest.showId);

    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }

    if (parseInt(show.seats) < requestedSeat) {
      return res.status(404).json({ message: "Not enough seats available" });
    }

    const updateSeats = parseInt(show.seats) - requestedSeat;

    const date = Object.keys(movie.shows).find((d) =>
      movie.shows[d].some((s) => s.id === bookingRequest.showId)
    );
    console.log(movie.shows[date]);
    const showIndex = movie.shows[date].findIndex(
      (s) => s.id === bookingRequest.showId
    );

    // Create booking document
    const bookingData = {
      movieId: bookingRequest.movieId,
      showId: bookingRequest.showId,
      date: date,
      name: bookingRequest.name,
      email: bookingRequest.email,
      phoneNumber: bookingRequest.phoneNumber,
      seats: requestedSeat,
      createdAt: new Date(),
    };

    // Insert booking into the bookings collection
    const bookingResult = await bookingsCollection.insertOne(bookingData);

    if (!bookingResult.insertedId) {
      return res.status(500).json({ message: "Failed to create booking" });
    }

    return res.status(200).json({ message: "Booking created successfully" });

  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});

app.listen(3000);
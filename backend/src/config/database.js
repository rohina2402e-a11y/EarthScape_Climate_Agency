import mongoose from "mongoose";

const requiredCollections = ["users", "datasets", "alerts", "feedback"];

export async function connectToDatabase(uri) {
  await mongoose.connect(uri);

  const database = mongoose.connection.db;
  const existingCollections = new Set(
    (await database.listCollections({}, { nameOnly: true }).toArray())
      .map((collection) => collection.name)
  );

  for (const collectionName of requiredCollections) {
    if (!existingCollections.has(collectionName)) {
      await database.createCollection(collectionName);
    }
  }

  console.log(`Connected to MongoDB database "${mongoose.connection.name}".`);
  console.log(`Ensured MongoDB collections: ${requiredCollections.join(", ")}.`);
}

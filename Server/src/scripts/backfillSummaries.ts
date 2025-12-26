import dotenv from 'dotenv';
dotenv.config();
import dbConnect from '../config/db';
import userContent from '../models/contentModel';
import { generateSummary } from '../controllers/crudController';

async function main() {
  await dbConnect();
  console.log('Connected to DB, looking for documents needing summaries...');
  const docs = await userContent.find({ $or: [{ summary: { $exists: false } }, { summary: '' }] });
  console.log(`Found ${docs.length} documents to process`);

  for (const doc of docs) {
    try {
      console.log(`Processing: ${doc.title} (${doc.link})`);
      if (!doc.link) {
        console.log(' -> No link, skipping');
        continue;
      }
      const s = await generateSummary(doc.link);
      if (s) {
        doc.summary = s;
        await doc.save();
        console.log(' -> Summary saved');
      } else {
        console.log(' -> No summary found');
      }
    } catch (err) {
      console.error('Error processing', doc._id, err);
    }
  }

  console.log('Backfill completed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
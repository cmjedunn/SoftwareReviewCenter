import mongoose from 'mongoose';

const nameSchema = new mongoose.Schema({
    first: { type: String, required: true },
    last: { type: String, required: true }
});

const userSchema = new mongoose.Schema({
    name: { type: nameSchema, required: true },
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
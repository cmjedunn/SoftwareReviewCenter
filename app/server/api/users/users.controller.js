import User from './users.model.js';

export async function createUser(req, res) {
    try {
        const user = await User.create(req.body);
        res.status(201).json(user);
    } catch (err) {
        const code = err.code === 11000 ? 409 : 400; 
        res.status(code).json({ error: err.message });
    }
}

export async function listUsers(_req, res) {
    const users = await User.find();
    res.json(users);
}

export async function getUserById(req, res) {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
}

export async function updateUser(req, res) {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

export async function deleteUser(req, res) {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.sendStatus(204);
}
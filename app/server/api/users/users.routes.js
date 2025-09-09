import { Router } from 'express';
import {
    createUser,
    listUsers,
    getUserById,
    updateUser,
    deleteUser
} from './users.controller.js';

const router = Router();

router.route('/')
    .post(createUser)
    .get(listUsers);

router.route('/:id')
    .get(getUserById)
    .patch(updateUser)
    .delete(deleteUser);

export default router;
import { Router } from 'express';
import { register, login, getUserProfile, updateUserProfile } from '../controllers/userController.js';
import { createStory, getStories, getStoryById, updateStory, deleteStory } from '../controllers/storyController.js';
import { addNode, getNodesByStory, selectNode } from '../controllers/nodeController.js';
import { likeStory, favoriteStory, coinNode, getUserFavorites } from '../controllers/interactionController.js';
import { exchangePoints, getUserInventory, useItem } from '../controllers/inventoryController.js';
import { createTeam, joinTeam, getTeams, getUserTeams, createCompetition, joinCompetition, getCompetitions, getCompetitionLeaderboard } from '../controllers/teamController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/users/register', register);
router.post('/users/login', login);
router.get('/users/profile', authenticate, getUserProfile);
router.put('/users/profile', authenticate, updateUserProfile);

router.post('/stories', authenticate, createStory);
router.get('/stories', getStories);
router.get('/stories/:id', getStoryById);
router.put('/stories/:id', authenticate, updateStory);
router.delete('/stories/:id', authenticate, deleteStory);

router.post('/nodes', authenticate, addNode);
router.get('/nodes/:story_id', getNodesByStory);
router.put('/nodes/:node_id/select', authenticate, selectNode);

router.post('/stories/:story_id/like', authenticate, likeStory);
router.post('/stories/:story_id/favorite', authenticate, favoriteStory);
router.post('/nodes/:node_id/coin', authenticate, coinNode);
router.get('/favorites', authenticate, getUserFavorites);

router.post('/inventory/exchange', authenticate, exchangePoints);
router.get('/inventory', authenticate, getUserInventory);
router.post('/inventory/use', authenticate, useItem);

router.post('/teams', authenticate, createTeam);
router.post('/teams/:team_id/join', authenticate, joinTeam);
router.get('/teams', getTeams);
router.get('/teams/user', authenticate, getUserTeams);

router.post('/competitions', authenticate, createCompetition);
router.post('/competitions/join', authenticate, joinCompetition);
router.get('/competitions', getCompetitions);
router.get('/competitions/:competition_id/leaderboard', getCompetitionLeaderboard);

export default router;

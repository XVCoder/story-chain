import { Router } from 'express';
import { register, login, getUserProfile, updateUserProfile, checkIn, getUserStats } from '../controllers/userController.js';
import { createStory, getStories, getStoryById, updateStory, deleteStory, getMyStories, searchStories } from '../controllers/storyController.js';
import { addNode, getNodesByStory, selectNode, autoSelectMainLine, getTimeline } from '../controllers/nodeController.js';
import { likeStory, favoriteStory, coinNode, getUserFavorites } from '../controllers/interactionController.js';
import { exchangePoints, getUserInventory, useItem } from '../controllers/inventoryController.js';
import { createTeam, joinTeam, getTeams, getUserTeams, getTeamMembers, leaveTeam, createCompetition, joinCompetition, getCompetitions, getCompetitionLeaderboard } from '../controllers/teamController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/users/register', register);
router.post('/users/login', login);
router.get('/users/profile', authenticate, getUserProfile);
router.put('/users/profile', authenticate, updateUserProfile);
router.post('/users/check-in', authenticate, checkIn);
router.get('/users/stats', authenticate, getUserStats);

router.post('/stories', authenticate, createStory);
router.get('/stories', getStories);
router.get('/stories/search', searchStories);
router.get('/stories/my', authenticate, getMyStories);
router.get('/stories/:story_id/timeline', getTimeline);
router.get('/stories/:id', getStoryById);
router.put('/stories/:id', authenticate, updateStory);
router.delete('/stories/:id', authenticate, deleteStory);

router.post('/nodes', authenticate, addNode);
router.get('/nodes/:story_id', getNodesByStory);
router.put('/nodes/:node_id/select', authenticate, selectNode);
router.post('/nodes/:story_id/auto-select', authenticate, autoSelectMainLine);
router.get('/stories/:story_id/timeline', getTimeline);

router.post('/stories/:story_id/like', authenticate, likeStory);
router.post('/stories/:story_id/favorite', authenticate, favoriteStory);
router.post('/nodes/:node_id/coin', authenticate, coinNode);
router.get('/favorites', authenticate, getUserFavorites);

router.post('/inventory/exchange', authenticate, exchangePoints);
router.get('/inventory', authenticate, getUserInventory);
router.post('/inventory/use', authenticate, useItem);

router.post('/teams', authenticate, createTeam);
router.post('/teams/:team_id/join', authenticate, joinTeam);
router.post('/teams/:team_id/leave', authenticate, leaveTeam);
router.get('/teams/:team_id/members', getTeamMembers);
router.get('/teams', getTeams);
router.get('/teams/user', authenticate, getUserTeams);

router.post('/competitions', authenticate, createCompetition);
router.post('/competitions/join', authenticate, joinCompetition);
router.get('/competitions', getCompetitions);
router.get('/competitions/:competition_id/leaderboard', getCompetitionLeaderboard);

export default router;

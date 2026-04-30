import { createRouter, createWebHistory } from 'vue-router';
import StoryList from '../components/StoryList.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: StoryList,
    },
    {
      path: '/story/:id',
      name: 'story-detail',
      component: () => import('../components/StoryDetail.vue'),
      props: true,
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../components/ProfilePage.vue'),
    },
    {
      path: '/teams',
      name: 'teams',
      component: () => import('../components/TeamPage.vue'),
    },
    {
      path: '/competitions',
      name: 'competitions',
      component: () => import('../components/CompetitionPage.vue'),
    },
    {
      path: '/my-stories',
      name: 'my-stories',
      component: () => import('../components/MyStories.vue'),
    },
  ],
});

export default router;
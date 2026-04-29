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
  ],
});

export default router;
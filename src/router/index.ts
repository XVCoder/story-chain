import { createRouter, createWebHistory } from 'vue-router';
import { store } from '../store';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../components/LoginPage.vue'),
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('../components/StoryList.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/story/:id',
      name: 'story-detail',
      component: () => import('../components/StoryDetail.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../components/ProfilePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/teams',
      name: 'teams',
      component: () => import('../components/TeamPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/competitions',
      name: 'competitions',
      component: () => import('../components/CompetitionPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-stories',
      name: 'my-stories',
      component: () => import('../components/MyStories.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token || !!store.user;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' });
  } else if (to.name === 'login' && isAuthenticated) {
    next({ name: 'home' });
  } else {
    next();
  }
});

export default router;

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/ordering' },
      { path: 'students', component: () => import('pages/StudentsPage.vue') },
      { path: 'restaurants', component: () => import('pages/RestaurantsPage.vue') },
      { path: 'ordering', component: () => import('pages/OrderingPage.vue') },
      { path: 'meals', component: () => import('pages/MealFeePage.vue') },
      { path: 'tuition', component: () => import('pages/TuitionPage.vue') }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes

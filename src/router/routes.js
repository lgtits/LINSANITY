const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/ordering' },
      { path: 'students',          component: () => import('pages/StudentsPage.vue') },
      { path: 'students/archived', component: () => import('pages/ArchivedStudentsPage.vue') },
      { path: 'students/deleted',  component: () => import('pages/DeletedStudentsPage.vue') },
      { path: 'restaurants', component: () => import('pages/RestaurantsPage.vue') },
      { path: 'ordering', component: () => import('pages/OrderingPage.vue') },
      { path: 'meals', component: () => import('pages/MealFeePage.vue') },
      { path: 'tuition',       component: () => import('pages/TuitionPage.vue') },
      { path: 'tuition/rates', component: () => import('pages/TuitionRatesPage.vue') },
      { path: 'broadcast',           component: () => import('pages/BroadcastPage.vue') },
      { path: 'broadcast/history',   component: () => import('pages/BroadcastHistoryPage.vue') },
      { path: 'broadcast/templates', component: () => import('pages/BroadcastTemplatesPage.vue') }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes

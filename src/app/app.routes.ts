import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { DashboardComponent } from './pages/dashboard/dashboard/dashboard.component';
import { ManagerComponent } from './pages/job-posts/manager/manager.component';
import { ListTestComponent } from './pages/test/list-test/list-test.component';
import { CreateTestComponent } from './pages/test/create-test/create-test.component';
import { TakeTestComponent } from './pages/test/take-test/take-test.component';
import { canRefreshGuard } from './can-refresh.guard';
import { PageNotFoundComponent } from './pages/special/page-not-found/page-not-found.component';
import { SubmissionsComponent } from './pages/test/submissions/submissions.component';
import { JobPostDashboadComponent } from './pages/job-posts/job-post-dashboad/job-post-dashboad.component';
import { ApplicationViewComponent } from './pages/job-posts/manager/application-view/application-view.component';

export const routes: Routes = [
  // { path: '', component: LandingComponent },
  // { path: 'dashboard', component: DashboardComponent },
  { path: 'jobposts/:userId', component: JobPostDashboadComponent },
  { path: 'jobposts/manager/:jobId', component: ManagerComponent },
  { path: 'jobposts/tests/:jobId', component: ListTestComponent },
  { path: 'jobposts/applicants/:jobId', component: DashboardComponent },
  {
    path: 'jobposts/tests/manager/create/:jobId',
    component: CreateTestComponent,
  },
  {
    path: 'preview/:templateId',
    component: ApplicationViewComponent,
  },
  {
    path: 'apply/:company/:applicationId/:formOnly',
    component: ApplicationViewComponent,
  },
  {
    path: 'jobposts/tests/manager/update/:jobId/:testId',
    component: CreateTestComponent,
  },
  // {
  //   path: 'jobposts/tests/take-test/:testId',
  //   component: PageNotFoundComponent,
  //   canDeactivate: [canRefreshGuard]
  // },
  {
    path: 'jobposts/tests/submissions/:testId',
    component: SubmissionsComponent,
  },
  {
    path: 'jobposts/tests/take-test/:testId',
    component: TakeTestComponent,
    canDeactivate: [canRefreshGuard],
  },
];

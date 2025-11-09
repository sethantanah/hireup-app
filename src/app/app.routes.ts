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
import { SignupComponent } from './pages/auth/signup/signup.component';
import { SigninComponent } from './pages/auth/signin/signin.component';
import { authGuard } from './guards/auth.guard';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';

export const routes: Routes = [
  { path: '', component: PageNotFoundComponent  },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'jobposts/:userId', component: JobPostDashboadComponent, canActivate: [authGuard] },
  { path: 'jobposts/manager/:jobId', component: ManagerComponent, canActivate: [authGuard] },
  { path: 'jobposts/tests/:jobId', component: ListTestComponent, canActivate: [authGuard]},
  { path: 'jobposts/applicants/:jobId', component: DashboardComponent, canActivate: [authGuard] },
  {
    path: 'jobposts/tests/manager/create/:jobId',
    component: CreateTestComponent, canActivate: [authGuard]
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
    path: 'apply/:company/:applicationId/:formOnly',
    component: ApplicationViewComponent,
  },
  {
    path: 'apply/:company/:applicationId',
    component: ApplicationViewComponent,
  },
  {
    path: 'jobposts/tests/manager/update/:jobId/:testId',
    component: CreateTestComponent, canActivate: [authGuard]
  },
  {
    path: 'jobposts/tests/take-test/:testId',
    component: TakeTestComponent,
    canDeactivate: [canRefreshGuard]
  },
  {
    path: 'jobposts/tests/submissions/:testId',
    component: SubmissionsComponent, canActivate: [authGuard]
  },
   {
    path: 'auth',
    component: SignupComponent,
  },
  {
    path: 'auth/signup',
    component: SignupComponent,
  },{
    path: 'auth/signin',
    component: SigninComponent,
  },
  { path: 'auth/callback', component: AuthCallbackComponent }, // New route
  { path: '**', redirectTo: 'jobposts/:userId' }
];

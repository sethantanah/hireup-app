import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { DashboardComponent } from './pages/dashboard/dashboard/dashboard.component';
import { ManagerComponent } from './pages/job-postings/manager/manager.component';
import { ListTestComponent } from './pages/test/list-test/list-test.component';
import { CreateTestComponent } from './pages/test/create-test/create-test.component';
import { TakeTestComponent } from './pages/test/take-test/take-test.component';
import { canRefreshGuard } from './can-refresh.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'jobposts', component: ManagerComponent },
  { path: 'jobposts/tests/:jobId', component: ListTestComponent },
  {
    path: 'jobposts/tests/manager/create/:jobId',
    component: CreateTestComponent,
  },
  {
    path: 'jobposts/tests/manager/update/:jobId/:testId',
    component: CreateTestComponent,
  },
  {
    path: 'jobposts/tests/take-test/:testId',
    component: TakeTestComponent,
    canDeactivate: [canRefreshGuard]
  },
];

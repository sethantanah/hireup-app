import { Routes } from '@angular/router';
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
import { TrackingComponent } from './pages/job-posts/tracking/tracking.component';
import { LandingComponent } from './pages/landing/landing.component';
import { SubmitEndorsementComponent } from './pages/job-posts/submit-endorsement/submit-endorsement.component';
import { JobReferencesComponent } from './pages/job-posts/job-references/job-references.component';
import { CandidatePortalComponent } from './pages/candidate/candidate-portal/candidate-portal.component';
import { OnboardingHubComponent } from './pages/onboarding/onboarding-hub/onboarding-hub.component';
import { OfferStudioComponent } from './pages/offer-management/offer-studio/offer-studio.component';
import { OfferViewComponent } from './pages/offer-management/offer-view/offer-view.component';
import { ScorecardManagerComponent } from './pages/interview-scorecards/scorecard-manager/scorecard-manager.component';
import { ScheduledInterviewsComponent } from './pages/interview-scorecards/scheduled-interviews/scheduled-interviews.component';

export const routes: Routes = [
  {
    path: '', loadComponent: () =>
      import('./pages/landing/landing.component')
        .then(m => m.LandingComponent)
  },
  { path: 'dashboard', component: JobPostDashboadComponent, canActivate: [authGuard] },
  { path: 'jobposts/manager/:jobId', component: ManagerComponent, canActivate: [authGuard] },
  { path: 'jobposts/tests/:jobId', component: ListTestComponent, canActivate: [authGuard] },
  { path: 'jobposts/applicants/:jobId/:stageId', component: DashboardComponent, canActivate: [authGuard] },
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
    path: 'apply/:company/:applicationId/:applicationType',
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
    path: 'jobposts/tests/take/:testId',
    component: TakeTestComponent,
    canDeactivate: [canRefreshGuard]
  },
  {
    path: 'jobposts/tests/submissions/:testId',
    component: SubmissionsComponent, canActivate: [authGuard]
  },
  {
    path: 'jobpost/tracking',
    component: TrackingComponent
  },
  {
    path: 'auth',
    component: SigninComponent,
  },
  {
    path: 'auth/signup',
    component: SignupComponent,
  }, 
  {
    path: 'auth/signin',
    component: SigninComponent,
  },
  {
    path: 'auth/login',
    component: SigninComponent,
  },
  {
    path: 'auth/register',
    component: SignupComponent,
  },
  {
    path: 'auth/recruiter/login',
    component: SigninComponent,
  },
  {
    path: 'auth/recruiter/register',
    component: SignupComponent,
  },
  {
    path: 'auth/candidate/login',
    component: SigninComponent,
  },
  {
    path: 'auth/candidate/register',
    component: SignupComponent,
  },
  {
    path: 'submit/endorsement/:jobId/:applicationId',
    component: SubmitEndorsementComponent,
  },
  {
    path: 'job-endorsements/:jobId',
    component: JobReferencesComponent,
  },
  {
    path: 'candidate-portal',
    component: CandidatePortalComponent,
    canActivate: [authGuard]
  },
  {
    path: 'onboarding',
    component: OnboardingHubComponent,
    canActivate: [authGuard]
  },
  {
    path: 'offer-studio',
    component: OfferStudioComponent,
    canActivate: [authGuard]
  },
  {
    path: 'offer/view/:linkToken',
    component: OfferViewComponent
  },
  {
    path: 'interview-scorecards',
    component: ScorecardManagerComponent,
    canActivate: [authGuard]
  },
  {
    path: 'scheduled-interviews',
    component: ScheduledInterviewsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'talent/interviews',
    component: ScheduledInterviewsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'organization-settings',
    loadComponent: () => import('./pages/organization-settings/organization-settings.component').then(m => m.OrganizationSettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings/organization',
    loadComponent: () => import('./pages/organization-settings/organization-settings.component').then(m => m.OrganizationSettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'accept-invitation',
    loadComponent: () => import('./pages/accept-invitation/accept-invitation.component').then(m => m.AcceptInvitationComponent)
  },
  { path: 'auth/callback', component: AuthCallbackComponent }, // New route
  {
    path: 'api-connections/:connId/portal',
    loadComponent: () => import('./pages/api-connection-portal/api-connection-portal.component').then(m => m.ApiConnectionPortalComponent),
    canActivate: [authGuard]
  },
  {
    path: 'document-import',
    loadComponent: () => import('./pages/document-import-portal/document-import-portal.component').then(m => m.DocumentImportPortalComponent),
    canActivate: [authGuard]
  },
  {
    path: 'document-migration',
    loadComponent: () => import('./pages/document-import-portal/document-import-portal.component').then(m => m.DocumentImportPortalComponent),
    canActivate: [authGuard]
  },
  {
    path: 'ai-copilot',
    loadComponent: () => import('./pages/ai-copilot/copilot-page.component').then(m => m.CopilotPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'api-connection-copilot',
    loadComponent: () => import('./pages/api-connection-copilot/api-connection-copilot.component').then(m => m.ApiConnectionCopilotComponent),
    canActivate: [authGuard]
  },
  { path: '**', component: PageNotFoundComponent }
];

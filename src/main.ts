import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { environment } from './environment/environment';

const firebaseApp = initializeApp(environment.firebase);

if (environment.production && typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(firebaseApp);
    }
  });
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

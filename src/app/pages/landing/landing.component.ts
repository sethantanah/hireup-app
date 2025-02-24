import { Component, HostListener, OnInit } from '@angular/core';
import { UploadResumeComponent } from '../../components/upload-resume/upload-resume.component';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, UploadResumeComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit{
  // Mock API response data
  landingPageData: any = null;

  isNavOpen = false; // Controls the visibility of the mobile navigation menu
  isMobile = false; // Tracks if the screen is in mobile view


  // Close navigation menu on larger screens
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.isMobile = window.innerWidth < 768; // 768px is the breakpoint for 'md' in Tailwind
    if (!this.isMobile) {
      this.isNavOpen = false; // Close the nav menu when resizing to a larger screen
    }
  }

  constructor(private apiService: ApiService) {
    this.landingPageData = apiService.getData(this.apiService.jobpost_id);
  }


  ngOnInit() {
    this.isMobile = window.innerWidth < 768; // Check if the screen is mobile on initial load
  }

  // Toggle navigation menu
  toggleNav() {
    this.isNavOpen = !this.isNavOpen;
  }
}

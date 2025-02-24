import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { FormsModule } from '@angular/forms';
import { JobFormEditorComponent } from './components/company-form/job-form-editor/job-form-editor.component';

@Component({
  selector: 'app-manager',
  imports: [CommonModule, FormsModule, JobFormEditorComponent ],
  templateUrl: './manager.component.html',
  styleUrl: './manager.component.scss',
})
export class ManagerComponent {
}
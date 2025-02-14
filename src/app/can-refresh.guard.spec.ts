import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn } from '@angular/router';

import { canRefreshGuard } from './can-refresh.guard';

describe('canRefreshGuard', () => {
  const executeGuard: CanDeactivateFn<unknown> = (...guardParameters) => 
      TestBed.runInInjectionContext(() => canRefreshGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});

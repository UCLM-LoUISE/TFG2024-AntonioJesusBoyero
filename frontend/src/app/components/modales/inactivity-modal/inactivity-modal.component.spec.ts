import { InactivityModalComponent } from './inactivity-modal.component';

describe('InactivityModalComponent', () => {
  let component: InactivityModalComponent;
  let mockInactivityService: any;
  let modalShowSpy: jasmine.Spy;
  let modalHideSpy: jasmine.Spy;
  let modalDiv: HTMLElement;
  let originalBootstrap: any;
  let originalInstance: any;

  beforeEach(() => {
    jasmine.clock().install();
    originalBootstrap = (window as any).bootstrap;
    originalInstance = InactivityModalComponent.Instance;

    modalShowSpy = jasmine.createSpy('modal.show');
    modalHideSpy = jasmine.createSpy('modal.hide');

    (window as any).bootstrap = {
      Modal: class {
        constructor(el: any, opts?: any) { }
        show() { modalShowSpy(); }
        hide() { modalHideSpy(); }
        static getInstance(el: any) { return { show() { }, hide() { } }; }
      }
    };

    modalDiv = document.createElement('div');
    modalDiv.id = 'inactivityModal';
    document.body.appendChild(modalDiv);

    mockInactivityService = {
      resetTimeout: jasmine.createSpy('resetTimeout'),
      logoutDueToInactivity: jasmine.createSpy('logoutDueToInactivity')
    };

    component = new InactivityModalComponent(mockInactivityService);
    component.ngOnInit();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    modalDiv.remove();
    (window as any).bootstrap = originalBootstrap;
    InactivityModalComponent.Instance = originalInstance;
  });

  it('should create and register itself as singleton instance', () => {
    expect(component).toBeTruthy();
    expect(InactivityModalComponent.Instance).toBe(component);
  });

  it('ngOnInit should build the bootstrap modal instance from the DOM element', () => {
    expect((component as any).modalInstance).toBeDefined();
  });

  it('ngOnInit should not fail when the modal element is missing', () => {
    modalDiv.remove();
    const comp2 = new InactivityModalComponent(mockInactivityService);
    expect(() => comp2.ngOnInit()).not.toThrow();
    expect((comp2 as any).modalInstance).toBeUndefined();
    // Restore singleton to the component under test
    InactivityModalComponent.Instance = component;
  });

  it('show should display the modal and auto-logout after the popup limit', () => {
    component.show();
    expect(modalShowSpy).toHaveBeenCalledTimes(1);
    expect(mockInactivityService.logoutDueToInactivity).not.toHaveBeenCalled();

    jasmine.clock().tick(120 * 1000);
    expect(mockInactivityService.logoutDueToInactivity).toHaveBeenCalledTimes(1);
    expect(modalHideSpy).toHaveBeenCalledTimes(1);
  });

  it('hide should hide the modal and clear the pending timeout', () => {
    component.show();
    component.hide();
    expect(modalHideSpy).toHaveBeenCalledTimes(1);

    jasmine.clock().tick(120 * 1000);
    // Timeout cleared: logout must not have been triggered
    expect(mockInactivityService.logoutDueToInactivity).not.toHaveBeenCalled();
  });

  it('onConfirm should hide the modal and reset the inactivity timeout', () => {
    component.show();
    component.onConfirm();
    expect(modalHideSpy).toHaveBeenCalledTimes(1);
    expect(mockInactivityService.resetTimeout).toHaveBeenCalledTimes(1);
    jasmine.clock().tick(120 * 1000);
    expect(mockInactivityService.logoutDueToInactivity).not.toHaveBeenCalled();
  });

  it('onCancel should hide the modal and logout', () => {
    component.show();
    component.onCancel();
    expect(modalHideSpy).toHaveBeenCalledTimes(1);
    expect(mockInactivityService.logoutDueToInactivity).toHaveBeenCalledTimes(1);
  });

  it('show and hide should log an error when the singleton instance is missing', () => {
    const errorSpy = spyOn(console, 'error');
    InactivityModalComponent.Instance = null as any;
    component.show();
    component.hide();
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(modalShowSpy).not.toHaveBeenCalled();
    InactivityModalComponent.Instance = component;
  });
});

import { AfterContentChecked, AfterContentInit, Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: 'textarea[autosize]'
})

export class AutosizeDirective implements AfterContentChecked, AfterContentInit {


  @HostListener('input', [ '$event.target' ])
  onInput(textArea: HTMLTextAreaElement): void {
    this.adjust();
  }

  constructor(public element: ElementRef, private renderer: Renderer2) {
  }

  ngAfterContentInit(): void {
    setTimeout(() => {
      this.adjust();
    }, 100)
  }


  ngAfterContentChecked(): void {
    this.adjust();
  }

  adjust(): void {
    this.renderer.setStyle(this.element.nativeElement, 'overflow', 'hidden');
    this.renderer.setStyle(this.element.nativeElement, 'height', 'auto');
    this.renderer.setStyle(this.element.nativeElement, 'height', `${this.element.nativeElement.scrollHeight}px`);

  }
}

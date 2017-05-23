import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'civ-loading',
  template: `
    <div class="icon dark"></div>
  `,
  styles: [ `
    :host {
      display: block;
      position: relative;
    }

    .icon {
      background-image: url(/assets/img/civ_logo_dark.png);
      position: absolute;
      top: 40%;
      left: 48%;
      height: 100px;
      width: 100px;
      background-repeat: no-repeat;
      background-position: 50%;
      -webkit-animation-iteration-count: infinite;
      animation: iconSpin 4s ease 0.5s;
      animation-iteration-count: infinite;
    }

    .loader, .loader:before, .loader:after {
      border-radius: 50%;
    }

    .loader:before, .loader:after {
      position: absolute;
      content: '';
    }

    .loader {
      font-size: 11px;
      text-indent: -99999em;
      position: absolute;
      top: 40%;
      left: 48%;
    }

    .loader:before {
      width: 70px;
      height: 140px;
      border: 3px solid rgba(14, 14, 14, 0.55);
      border-right: none;
      border-radius: 140px 0 0 140px;
      top: -0.1em;
      left: -0.1em;
      transform-origin: 70px 70px;
      animation: load2 2s infinite ease 1.5s;
    }

    .loader:after {
      width: 70px;
      height: 140px;
      border: 3px solid rgba(14, 14, 14, 0.35);
      border-left: none;
      border-radius: 0 140px 140px 0;
      top: -2px;
      left: 70px;
      transform-origin: 0 70px;
      animation: load2 2s infinite ease;
    }

    @keyframes load2 {
      0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg);
      }

      100% {
        -webkit-transform: rotate(360deg);
        transform: rotate(360deg);
      }
    }

    @keyframes iconSpin {
      0% {
        transform: rotate3d(0, 1, 0, 0deg);
      }

      15% {
        transform: rotate3d(0, 1, 0, 20deg);
      }

      50% {
        transform: rotate3d(0, 1, 0, 180deg);
      }

      85% {
        transform: rotate3d(0, 1, 0, 340deg);
      }

      100% {
        transform: rotate3d(0, 1, 0, 360deg);
      }
    }


  ` ]
})
export class LoadingComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

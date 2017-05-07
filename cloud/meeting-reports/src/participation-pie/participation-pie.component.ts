import { Component, Input, OnInit } from '@angular/core';
import { arc, Arc, Pie, pie, PieArcDatum } from 'd3-shape';


export type Datatype = { name: string, value: number };

@Component({
  selector: 'civ-participation-pie',
  template: `
    <svg:svg [attr.height]="height" [attr.width]="width">
      <svg:g [attr.transform]="rootGTransform">
        <svg:g *ngFor="let slice of slices" class="pie-slice">
          <path [attr.d]="slice.path" [attr.fill]="slice.color"></path>
            <svg:text [attr.transform]="slice.label.transform" dy="0.35em" [attr.text-anchor]="slice.label.textAnchor">
                {{slice.label.text}}
            </svg:text>
        </svg:g>
      </svg:g>

    </svg:svg>
  `,
  styleUrls: ['./participation-pie.component.scss']
})
export class ParticipationPieComponent implements OnInit {
  @Input() data: Datatype[];


  pieFxn: Pie<this, Datatype> = pie<Datatype>().sort(null).value(it => it.value);

  arcFxn: Arc<this, PieArcDatum<Datatype>>;

  arcs: Array<PieArcDatum<Datatype>>;

  slices: any;

  height = 500;
  width = 800;
  innerRadius: number;
  outerRadius: number;
  rootGTransform: string;
  colors = ['#F44336', '#673AB7', '#03A9F4', '#4CAF50', '#FF5722', '#607D8B', '#9C27B0', '#3F51B5', '#009688', '#8BC34A', '#CDDC39', '#795548'];

  constructor() { }

  ngOnInit() {
    this.outerRadius = this.height / 2;
    this.innerRadius = this.outerRadius * 0.9;
    this.arcs = this.pieFxn(this.data);

    this.rootGTransform = `translate(${this.width / 2}, ${this.height / 2})`;

    this.arcFxn = arc<this, PieArcDatum<Datatype>>().context(null).innerRadius(0).outerRadius(this.innerRadius);

    const labelPositions = this.arcs.reduce((result, arc) => ({
      ...result,
      [arc.data.name]: this.calcLabelPosition(arc)
    }), {});
    const textAnchors = this.arcs.reduce((result, arc) => ({
      ...result,
      [arc.data.name]: this.calcTextAnchor(arc)
    }), {});

    this.slices = this.arcs.map(arc => {

      let labelPos = labelPositions[ arc.data.name ],
          textAnchor = textAnchors[ arc.data.name ];

      return {
        path: this.arcFxn(arc),
        data: arc.data,
        color: this.colors[arc.index % this.colors.length],
        label: {
          transform: `translate(${labelPos[0]}, ${labelPos[1]})`,
          textAnchor,
          text: arc.data.name
        }
      }
    });
  }

  calcTextAnchor(slice: PieArcDatum<Datatype>) {
    let rads = ((slice.endAngle - slice.startAngle) / 2) + slice.startAngle;
    if ((rads > 7 * Math.PI / 4 && rads < Math.PI / 4) || (rads > 3 * Math.PI / 4 && rads < 5 * Math.PI / 4)) {
      return 'middle';
    } else if (rads >= Math.PI / 4 && rads <= 3 * Math.PI / 4) {
      return 'start';
    } else if (rads >= 5 * Math.PI / 4 && rads <= 7 * Math.PI / 4) {
      return 'end';
    } else {
      return 'middle';
    }
  }

  calcLabelPosition(slice: PieArcDatum<Datatype>) {
    return [
      (this.outerRadius ) * Math.sin(((slice.endAngle - slice.startAngle) / 2) + slice.startAngle),
      -1 * (this.outerRadius) * Math.cos(((slice.endAngle - slice.startAngle) / 2) + slice.startAngle),
    ]
  }


}

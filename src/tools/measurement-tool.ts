import { Point, Vector } from '@flatten-js/core';
import { MeasurementEntity } from '../entities/MeasurementEntity';
import {
  addEntities,
  getActiveLineColor,
  getActiveLineWidth,
  setAngleGuideOriginPoint,
  setGhostHelperEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { assign, createMachine } from 'xstate';
import {
  DrawEvent,
  PointInputEvent,
  StateEvent,
  ToolContext,
} from './tool.types';
import { MEASUREMENT_DEFAULT_OFFSET, TO_RADIANS } from '../App.consts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { isPointEqual } from '../helpers/is-point-equal.ts';

export interface MeasurementContext extends ToolContext {
  startPoint: Point | null;
  endPoint: Point | null;
}

export enum MeasurementState {
  INIT = 'INIT',
  WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
  WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
  WAITING_FOR_OFFSET = 'WAITING_FOR_OFFSET',
}

export enum MeasurementAction {
  INIT_MEASUREMENT_TOOL = 'INIT_MEASUREMENT_TOOL',
  RECORD_START_POINT = 'RECORD_START_POINT',
  RECORD_END_POINT = 'RECORD_END_POINT',
  DRAW_TEMP_MEASUREMENT = 'DRAW_TEMP_MEASUREMENT',
  DRAW_FINAL_MEASUREMENT = 'DRAW_FINAL_MEASUREMENT',
}

export const measurementToolStateMachine = createMachine(
  {
    types: {} as {
      context: MeasurementContext;
      events: StateEvent;
    },
    context: {
      startPoint: null,
      endPoint: null,
      type: Tool.MEASUREMENT,
    },
    initial: MeasurementState.INIT,
    states: {
      [MeasurementState.INIT]: {
        description: 'Initializing the line tool',
        always: {
          actions: MeasurementAction.INIT_MEASUREMENT_TOOL,
          target: MeasurementState.WAITING_FOR_START_POINT,
        },
      },
      [MeasurementState.WAITING_FOR_START_POINT]: {
        description: 'Select the start point of the measurement',
        meta: {
          instructions: 'Select the start point of the measurement',
        },
        on: {
          MOUSE_CLICK: {
            actions: MeasurementAction.RECORD_START_POINT,
            target: MeasurementState.WAITING_FOR_END_POINT,
          },
          ABSOLUTE_POINT_INPUT: {
            actions: MeasurementAction.RECORD_START_POINT,
            target: MeasurementState.WAITING_FOR_END_POINT,
          },
        },
      },
      [MeasurementState.WAITING_FOR_END_POINT]: {
        description: 'Select the end point of the measurement',
        meta: {
          instructions: 'Select the end point of the measurement',
        },
        on: {
          DRAW: {
            actions: MeasurementAction.DRAW_TEMP_MEASUREMENT,
          },
          MOUSE_CLICK: {
            actions: MeasurementAction.RECORD_END_POINT,
            target: MeasurementState.WAITING_FOR_OFFSET,
          },
          NUMBER_INPUT: {
            actions: MeasurementAction.RECORD_END_POINT,
            target: MeasurementState.WAITING_FOR_OFFSET,
          },
          ABSOLUTE_POINT_INPUT: {
            actions: MeasurementAction.RECORD_END_POINT,
            target: MeasurementState.WAITING_FOR_OFFSET,
          },
          RELATIVE_POINT_INPUT: {
            actions: MeasurementAction.RECORD_END_POINT,
            target: MeasurementState.WAITING_FOR_OFFSET,
          },
          ESC: {
            target: MeasurementState.INIT,
          },
        },
      },
      [MeasurementState.WAITING_FOR_OFFSET]: {
        description: 'Select the offset to display the measurement at',
        meta: {
          instructions: 'Select the offset to display the measurement at',
        },
        on: {
          DRAW: {
            actions: MeasurementAction.DRAW_TEMP_MEASUREMENT,
          },
          MOUSE_CLICK: {
            actions: MeasurementAction.DRAW_FINAL_MEASUREMENT,
            target: MeasurementState.INIT,
          },
          NUMBER_INPUT: {
            actions: MeasurementAction.DRAW_FINAL_MEASUREMENT,
            target: MeasurementState.INIT,
          },
          ABSOLUTE_POINT_INPUT: {
            actions: MeasurementAction.DRAW_FINAL_MEASUREMENT,
            target: MeasurementState.INIT,
          },
          RELATIVE_POINT_INPUT: {
            actions: MeasurementAction.DRAW_FINAL_MEASUREMENT,
            target: MeasurementState.INIT,
          },
          ESC: {
            target: MeasurementState.INIT,
          },
        },
      },
    },
  },
  {
    actions: {
      [MeasurementAction.INIT_MEASUREMENT_TOOL]: assign(() => {
        setShouldDrawHelpers(true);
        setSelectedEntityIds([]);
        setGhostHelperEntities([]);
        setAngleGuideOriginPoint(null);
        return {
          startPoint: null,
          endPoint: null,
        };
      }),
      [MeasurementAction.RECORD_START_POINT]: assign(({ event }) => {
        const startPoint = getPointFromEvent(null, event as PointInputEvent);
        setAngleGuideOriginPoint(startPoint);
        return {
          startPoint,
        };
      }),
      [MeasurementAction.RECORD_END_POINT]: assign(({ context, event }) => {
        const endPoint = getPointFromEvent(
          context.startPoint,
          event as PointInputEvent,
        );
        setAngleGuideOriginPoint(endPoint);
        return {
          ...context,
          endPoint,
        };
      }),
      [MeasurementAction.DRAW_TEMP_MEASUREMENT]: ({ context, event }) => {
        const startPoint = context.startPoint as Point;

        let endPoint: Point;
        let offsetPoint: Point;
        if (!context.endPoint) {
          // User has drawn startPoint, but not yet endPoint
          // Endpoint should be the mouse location and offset should be MEASUREMENT_DEFAULT_OFFSET to either direction
          endPoint = (
            event as DrawEvent
          ).drawController.getWorldMouseLocation();

          if (isPointEqual(startPoint, endPoint)) {
            return; // Cannot draw temp measurement when start and endpoint are equal
          }

          const normalVector = new Vector(startPoint, endPoint)
            .rotate(-90 * TO_RADIANS)
            .normalize();
          offsetPoint = startPoint
            .clone()
            .translate(normalVector.multiply(MEASUREMENT_DEFAULT_OFFSET));
        } else {
          // User has already selected a startPoint and endPoint
          // The offsetPoint should be set to the mouse location
          endPoint = context.endPoint as Point;
          offsetPoint = (
            event as DrawEvent
          ).drawController.getWorldMouseLocation();
        }

        const activeMeasurement = new MeasurementEntity(
          context.startPoint as Point,
          endPoint,
          offsetPoint,
        );
        activeMeasurement.lineColor = getActiveLineColor();
        activeMeasurement.lineWidth = getActiveLineWidth();
        setGhostHelperEntities([activeMeasurement]);
      },
      [MeasurementAction.DRAW_FINAL_MEASUREMENT]: ({ context, event }) => {
        const offsetPoint = getPointFromEvent(
          context.endPoint,
          event as PointInputEvent,
        );
        const activeMeasurement = new MeasurementEntity(
          context.startPoint as Point,
          context.endPoint as Point,
          offsetPoint,
        );
        activeMeasurement.lineColor = getActiveLineColor();
        activeMeasurement.lineWidth = getActiveLineWidth();
        addEntities([activeMeasurement], true);
      },
    },
  },
);

# UI Governance Rules (Owner Request)

These rules are mandatory unless the owner explicitly asks otherwise.

## Business Modal Restrictions

In the business modal (Hospitality header area), do not render management action buttons.

Forbidden buttons in that area:
- Dashboard
- Quartos
- PIN Staff
- Recepcao
- Housekeeping
- Staff

Do not create new management buttons in that area without explicit owner instruction.

## PMS Dashboard Behavior

The Staff button inside PMS Dashboard must behave like other dashboard actions (Mapa, Gantt, Hospedes, Housekeeping):
- Opening Staff must not close the PMS Dashboard modal.
- Staff UI should open as an overlay/child flow while Dashboard remains open.

## Change Control

Before introducing any new management button placement in business modal:
1. Request explicit owner approval.
2. Document approved placement in this file.
3. Implement only after approval is confirmed.

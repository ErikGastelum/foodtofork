import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useKitchen } from '../context/KitchenContext.jsx'
import { DAYS, SLOTS, mealAt, today } from '../utils/mealPlan.js'
import '../styles/plan.css'

// "Add to meal plan" on the recipe detail page: pick a day and lunch/dinner, then add.
// `recipe` is the GET /recipes/{id} response.
export default function AddToPlan({ recipe }) {
  const { mealPlan, addMeal } = useKitchen()
  const [open, setOpen] = useState(false)
  const [day, setDay] = useState(today)
  const [slot, setSlot] = useState('dinner')

  const current = mealAt(mealPlan, day, slot)
  const isThis = current?.recipeId === String(recipe.id)
  const plannedOn = mealPlan.filter((m) => m.recipeId === String(recipe.id))

  if (!open) {
    return (
      <button type="button" className="btn btn--outline btn--block" onClick={() => setOpen(true)}>
        {plannedOn.length ? `📅 Planned for ${plannedOn.map((m) => `${m.day} ${m.slot}`).join(', ')}` : '📅 Add to meal plan'}
      </button>
    )
  }

  function add() {
    addMeal({
      day,
      slot,
      recipeId: String(recipe.id),
      name: recipe.name,
      thumbnail: recipe.thumbnail ?? null,
      ingredients: recipe.ingredients.map((i) => i.name),
    })
  }

  return (
    <div className="card add-to-plan">
      <div className="add-to-plan__chips" role="group" aria-label="Day">
        {DAYS.map((d) => (
          <button key={d} type="button" className={'chip' + (day === d ? ' chip--active' : '')} aria-pressed={day === d} onClick={() => setDay(d)}>
            {d}
          </button>
        ))}
      </div>
      <div className="add-to-plan__chips" role="group" aria-label="Meal">
        {SLOTS.map((s) => (
          <button key={s} type="button" className={'chip' + (slot === s ? ' chip--active' : '')} aria-pressed={slot === s} onClick={() => setSlot(s)}>
            {s === 'lunch' ? 'Lunch' : 'Dinner'}
          </button>
        ))}
      </div>

      {isThis ? (
        <Link to="/plan" className="btn btn--primary btn--block">
          ✓ Added to {day} {slot}. View plan
        </Link>
      ) : (
        <button type="button" className="btn btn--primary btn--block" onClick={add}>
          {current ? `Replace ${current.name} on ${day} ${slot}` : `Add to ${day} ${slot}`}
        </button>
      )}
    </div>
  )
}

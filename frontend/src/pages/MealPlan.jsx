import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useKitchen } from '../context/KitchenContext.jsx'
import { DAYS, SLOTS, mealAt, mealStatus, today } from '../utils/mealPlan.js'
import '../styles/plan.css'

// Weekly meal plan: Mon–Sun, lunch and dinner. Meals are added from a recipe's detail page
// ("Add to meal plan") and saved in localStorage via KitchenContext.
export default function MealPlan() {
  const { mealPlan, inventoryNames, removeMeal } = useKitchen()
  const now = today()

  const ready = mealPlan.filter((m) => mealStatus(m, inventoryNames).missing.length === 0).length
  const subtitle = mealPlan.length
    ? `${mealPlan.length} meal${mealPlan.length === 1 ? '' : 's'} planned · ${ready} ready to cook`
    : 'Plan your lunches and dinners for the week'

  return (
    <>
      <PageHeader title="Meal plan" subtitle={subtitle} />
      <div className="page plan-page">
        {mealPlan.length === 0 && (
          <p className="state-msg">
            <strong>Nothing planned yet.</strong>
            Open any recipe and tap “Add to meal plan”.
          </p>
        )}

        {DAYS.map((day) => (
          <section key={day} className={'plan-day' + (day === now ? ' plan-day--today' : '')}>
            <h2>
              {day}
              {day === now && <span className="chip chip--static">Today</span>}
            </h2>

            <div className="plan-day__slots">
              {SLOTS.map((slot) => {
                const meal = mealAt(mealPlan, day, slot)
                if (!meal) {
                  return (
                    <Link key={slot} to="/recipes" className="plan-slot plan-slot--empty">
                      + Add {slot}
                    </Link>
                  )
                }
                const { match, missing } = mealStatus(meal, inventoryNames)
                return (
                  <div key={slot} className="plan-slot card">
                    <Link to={`/recipes/${meal.recipeId}`} className="plan-slot__link">
                      <span className="plan-slot__img">{meal.thumbnail ? <img src={meal.thumbnail} alt="" /> : '🍽️'}</span>
                      <span className="item__text">
                        <span className="plan-slot__label">{slot}</span>
                        <span className="item__name">{meal.name}</span>
                        <span className={'chip chip--static' + (missing.length ? ' chip--warn' : '')}>
                          {missing.length ? `${match}% · ${missing.length} missing` : 'Ready to cook'}
                        </span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      className="item__remove"
                      aria-label={`Remove ${meal.name} from ${day} ${slot}`}
                      onClick={() => removeMeal(day, slot)}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

import React, { useContext, useState, useRef, useEffect } from 'react'
import Depense from './Depense'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'
import { AiOutlinePlus } from 'react-icons/ai'
import { ContextBudget } from '../../App'

export default function Depenses() {
    const {
        depenses, setDepenses,
        sumDepensesParCategorie, setSumDepensesParCategorie,
        sumDepenses, setSumDepenses,
        categoriesDepenses, setCategoriesDepenses
    } = useContext(ContextBudget)

    useEffect(() => {
        console.log('depenses: ', depenses)
        let sum_ = 0
        const newSumDepensesParCategorie = [...sumDepensesParCategorie]
        const categoriesNames = []

        depenses.categories.forEach((category, categoryIndex) => {
            categoriesNames.push(category.name)

            let sumByCategory_ = 0
            category.expenses.forEach((expense, expenseIndex) => {
                sumByCategory_ += parseFloat(expense.amount)
                sum_ += parseFloat(expense.amount)
            })
            newSumDepensesParCategorie[categoryIndex] = sumByCategory_
        });

        setSumDepensesParCategorie(newSumDepensesParCategorie)
        setSumDepenses(sum_)
        setCategoriesDepenses(categoriesNames)
    }, [depenses])

    const handleAddExpense = (categoryIndex) => {
        const nouvelleDepense = {
            "id": 'expense_' + Date.now().toString(),
            "name": '',
            "amount": 0
        }

        const depenses_ = { ...depenses }
        depenses_.categories[categoryIndex].expenses = [...depenses_.categories[categoryIndex].expenses, nouvelleDepense]

        setDepenses(depenses_)
    }

    const handleAddCategory = () => {
        const newCategory = {
            "name": '',
            "expenses": []
        };

        // Create a copy of the current investissements state
        const updatedDepenses = { ...depenses }

        // Add the new category to the categories array
        updatedDepenses.categories = [...updatedDepenses.categories, newCategory]

        // Update the investissements state with the new data
        setDepenses(updatedDepenses)
    }

    const handleCategoryNameInputChange = (event, index) => {
        console.log('index changed', index, ' value: ', event.target.value)

        // Create a copy of the current investissements state
        const updatedDepenses = { ...depenses }

        // Add the new category to the categories array
        updatedDepenses.categories = [...updatedDepenses.categories]

        // Change the category name
        updatedDepenses.categories[index].name = event.target.value

        // Update the investissements state with the new data
        setDepenses(updatedDepenses)
    }

    return (
        <div className='w-2/3 flex flex-col'>
            {
                depenses.categories.map((category, categoryIndex) => (
                    <div className='rounded-xl bg-black border border-gray-800 mt-5'>
                        <div className='flex flex-row justify-between border-b border-b-gray-800'>
                            <input className={'text-white bg-black border-none outline-none focus:ring-0 cursor-text m-10'}
                                type="text"
                                placeholder="Nom de la catégorie"
                                value={categoriesDepenses[categoryIndex]}
                                onChange={(event) => handleCategoryNameInputChange(event, categoryIndex)}
                            />
                            <div className='p-10 text-gray-400'>{sumDepensesParCategorie[categoryIndex]} €</div>
                        </div>

                        <div className='p-10 text-gray-400'>
                            <Droppable
                                droppableId='depenses'
                            >
                                {
                                    (provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps}>
                                            {
                                                category.expenses.map((expense, expenseIndex) => (
                                                    <Depense id={expense.id} categoryIndex={categoryIndex} index={expenseIndex} name={expense.name} amount={expense.amount} key={expense.id} />
                                                ))
                                            }
                                            {provided.placeholder}
                                        </div>
                                    )
                                }
                            </Droppable>
                            <div className='flex flex-row items-center cursor-pointer' onClick={() => handleAddExpense(categoryIndex)}>
                                <button className='mr-2'>Ajouter une dépense</button>
                                <AiOutlinePlus />
                            </div>
                        </div>
                    </div>
                ))
            }
            <div className='flex flex-row rounded-xl border border-dashed border-gray-800 p-5 mt-5 items-center cursor-pointer' onClick={handleAddCategory}>
                <button className='mr-2'>Ajouter une catégorie</button>
                <AiOutlinePlus />
            </div>

        </div>
    )
}

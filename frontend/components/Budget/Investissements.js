import React, { useContext, useState, useRef, useEffect } from 'react'
import Investissement from './Investissement'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'
import { AiOutlinePlus } from 'react-icons/ai'
import { ContextBudget } from '../../App'

export default function Investissements() {
    const {
        investissements, setInvestissements,
        sumInvestissementsParCategorie, setSumInvestissementsParCategorie,
        sumInvestissements, setSumInvestissements,
        categoriesInvestissements, setCategoriesInvestissements
    } = useContext(ContextBudget)

    useEffect(() => {
        console.log('investissements: ', investissements)
        let sum_ = 0
        const newSumInvestissementsParCategorie = [...sumInvestissementsParCategorie]
        const categoriesNames = []

        investissements.categories.forEach((category, categoryIndex) => {
            categoriesNames.push(category.name)

            let sumByCategory_ = 0
            category.investments.forEach((investment, investmentIndex) => {
                sumByCategory_ += parseFloat(investment.amount)
                sum_ += parseFloat(investment.amount)
            })
            newSumInvestissementsParCategorie[categoryIndex] = sumByCategory_
        });

        setSumInvestissementsParCategorie(newSumInvestissementsParCategorie)
        setSumInvestissements(sum_)
        setCategoriesInvestissements(categoriesNames)
    }, [investissements])

    const handleAddInvestment = (categoryIndex) => {
        const nouvelInvestissement = {
            "id": 'investment_' + Date.now().toString(),
            "name": '',
            "amount": 0
        }

        const investissements_ = { ...investissements }
        investissements_.categories[categoryIndex].investments = [...investissements_.categories[categoryIndex].investments, nouvelInvestissement]

        setInvestissements(investissements_)
    }

    const handleAddCategory = () => {
        const newCategory = {
            "name": '',
            "investments": []
        };

        // Create a copy of the current investissements state
        const updatedInvestissements = { ...investissements }

        // Add the new category to the categories array
        updatedInvestissements.categories = [...updatedInvestissements.categories, newCategory]

        // Update the investissements state with the new data
        setInvestissements(updatedInvestissements)
    }

    const handleCategoryNameInputChange = (event, index) => {
        // Create a copy of the current investissements state
        const updatedInvestissements = { ...investissements }

        // Add the new category to the categories array
        updatedInvestissements.categories = [...updatedInvestissements.categories]

        // Change the category name
        updatedInvestissements.categories[index].name = event.target.value

        // Update the investissements state with the new data
        setInvestissements(updatedInvestissements)
    }

    return (
        <div className='w-2/3 flex flex-col'>
            {
                investissements.categories.map((category, categoryIndex) => (
                    <div className='rounded-xl bg-black border border-gray-800 mt-5'>
                        <div className='flex flex-row justify-between border-b border-b-gray-800'>
                            <input className={'text-white bg-black border-none outline-none focus:ring-0 cursor-text m-10'}
                                type="text"
                                placeholder="Nom de la catégorie"
                                value={categoriesInvestissements[categoryIndex]}
                                onChange={(event) => handleCategoryNameInputChange(event, categoryIndex)}
                            />
                            <div className='m-10 text-gray-400'>{sumInvestissementsParCategorie[categoryIndex]} €</div>
                        </div>

                        <div className='p-10 text-gray-400'>
                            <Droppable
                                droppableId='investissements'
                            >
                                {
                                    (provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps}>
                                            {
                                                category.investments.map((investment, investmentIndex) => (
                                                    <Investissement id={investment.id} categoryIndex={categoryIndex} index={investmentIndex} name={investment.name} amount={investment.amount} key={investment.id} />
                                                ))
                                            }
                                            {provided.placeholder}
                                        </div>
                                    )
                                }
                            </Droppable>
                            <div className='flex flex-row items-center cursor-pointer' onClick={() => handleAddInvestment(categoryIndex)}>
                                <button className='mr-2'>Ajouter un investissement</button>
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

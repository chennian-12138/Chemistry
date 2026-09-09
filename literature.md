arXiv:2503.05810v3 [cs.LG] 24 Sep 2025

# A Transformer Model for Predicting Chemical Products from Generic SMARTS Templates with Data Augmentation

Derin Ozer<sup>1</sup>, Sylvain Lamprier<sup>1</sup>, Thomas Cauchy<sup>2</sup>, Nicolas Gutowski<sup>1</sup>, Benoit Da Mota<sup>1</sup>

<sup>1</sup>Univ Angers, LERIA, SFR MATHSTIC, F-49000 Angers, France

<sup>2</sup>Univ Angers, CNRS, MOLTECH-ANJOU, SFR MATRIX, F-49000 Angers, France

{derin.ozer, sylvain.lamprier, thomas.cauchy, nicolas.gutowski, benoit.damota}@univ-angers.fr

Abstract—The accurate prediction of chemical reaction outcomes is a major challenge in computational chemistry. Current models rely heavily on either highly specific reaction templates or template-free methods, both of which present limitations. To address these, this work proposes the Broad Reaction Set (BRS), a set featuring 20 generic reaction templates written in SMARTS, a pattern-based notation designed to describe substructures and reactivity. Additionally, we introduce ProPreT5, a T5-based model specifically adapted for chemistry and, to the best of our knowledge, the first language model capable of directly handling and applying SMARTS reaction templates. To further improve generalization, we propose the first augmentation strategy for SMARTS, which injects structural diversity at the pattern level. Trained on augmented templates, ProPreT5 demonstrates strong predictive performance and generalization to unseen reactions. Together, these contributions provide a novel and practical alternative to current methods, advancing the field of templatebased reaction prediction.

## I. INTRODUCTION

The accurate prediction of chemical reaction outcomes is an important task in chemistry as it allows the construction of organic synthesis routes. Given a set of reactive molecules i.e., reactants, the goal is to determine the outcome, the product. This task is especially challenging, requiring a thorough understanding of chemical substances, compound classes, reactions, underlying reactivity patterns, and reaction conditions. Such an understanding is fundamental for various applications, including: Drug discovery [1], material science [2], and green chemistry [3].

Organic chemistry synthesis route planning has usually been an expert-driven and rule-based approach. However, the advancement of machine learning has transformed the field of cheminformatics. Among the most promising techniques in this field are Transformer models [4], originally developed for sequence-to-sequence tasks in Natural Language Processing (NLP) [5]. The Transformer architecture has revolutionized NLP by enabling models to understand context through selfattention mechanisms. This capability helps the models to learn to dynamically assign weights to different parts of the input data to produce more accurate and contextually relevant outputs. The Transformer architecture has also been successfully applied to the field of chemistry in various tasks, such as single-step chemical reaction prediction [6]– [8], retrosynthesis [8], [9], molecule generation [10]–[12], and molecular property prediction [13]–[15]. However, these models are highly dependent on the quality and diversity of the data used for training.

Molecular data can be represented in the form of strings, which are derived from a graph traversal of their molecular structure. This compact representation, known as the Simplified Molecular Input Line Entry System (SMILES) [16] encodes molecules where each character represents an atom or bond, providing a linear representation useful for computational purposes and database storage. When the graph traversal follows the specific order established by the notation, the resulting SMILES is canonical, and a molecule has only one canonical SMILES but can have multiple non-canonical SMILES representations.

The SMILES notation can also be used to represent chemical reactions, encoding reactants (starting materials), reagents (substances that assist the reaction but do not transform), and products (final molecules produced). The SMARTS [17] notation, on the other hand, extends SMILES by representing patterns of atoms and bonds, or substructures within a molecule. It allows the identification of functional groups in reactants, creating reaction templates that capture general reactivity patterns and improve the prediction and recognition of chemical behavior.

The task of predicting reaction products studied in this paper is typically addressed using two different approaches: template-based methods, which rely on predefined rules (such as reactions represented by reaction SMILES or SMARTS), and template-free methods, which learn reactivity patterns directly from large datasets without relying on predefined rules or patterns.

Publicly available reaction datasets are obtained through data extraction from patents published by the United States Patent and Trademark Office (USPTO) [18]. These reactions are represented using SMILES representation along with their reactants and reagents. Previous work has created a sub-dataset called USPTO MIT [19] by filtering it to 470,000 examples and splitting it into train/test/validation sets. USPTO MIT datasets are widely used in the literature.

Since USPTO datasets are derived from patents, they provide highly specific reactions tailored exclusively to particular reactant-product combinations. Furthermore, the chemical space explored using these datasets is limited to the information contained within the patented reactions. Consequently, we assume that relying solely on patents introduces bias during training, leaving a substantial portion of the chemical space unaccounted for. While previous work [8] has demonstrated great accuracy in predicting reaction outcomes using this dataset, the lack of real-world applications stemming from such models highlights a key limitation: models trained solely on the patented chemical space suffer from generalization issues and are unsuitable for practical applications [20].

Such limitations and observations have led us to propose a new dataset called Broad Reaction Set (BRS) that bridges the gap between regular expressions and overly specific reaction SMILES. These reactions are expressed using the SMARTS syntax and represent broader transformation patterns rather than single, specific reactions. This approach enables us to explore a more comprehensive portion of the chemical space, which is a fundamental step for the tasks of organic synthesis and molecule discovery.

Reaction template datasets are often argued to be difficult to maintain due to the endless and unmanageable number of reactant-product combinations [7], leading many to favor template-free methods as the future of the field. Maintaining templates for highly specific reactions, such as those in USPTO, is undeniably challenging. In contrast, we argue that using generic reactions, as in the proposed BRS, preserves the benefits of reaction templates while avoiding the associated maintenance issues.

To explore the potential of the proposed BRS, we introduce ProPreT5, a T5-based model tailored for the reaction product prediction task. ProPreT5 is trained in both template-based and template-free settings using the standard USPTO MIT dataset as well as a newly constructed dataset based on the generic BRS reaction templates. The aim of this work is not to improve performance on USPTO MIT, but to propose a more flexible and realistic alternative. For this reason, we adopt an economical training setup and use USPTO MIT primarily as a sanity check. In contrast, our main focus lies in training and evaluating the model on the more challenging dataset derived from BRS. To support learning in this setting, we also propose a novel augmentation strategy for SMARTS templates, designed to enhance generalization from a limited number of generic reactions.

The contributions presented in this article are threefold:

• We address the limitations of publicly available reaction datasets by introducing a novel generic reaction set BRS, allowing for a broader exploration of the chemical space.

• We release ProPreT5, an improved and highly flexible T5-based model capable of generating accurate reaction products. To the best of our knowledge, it is also the first large language model capable of handling and applying SMARTS templates.

• We propose the first augmentation strategy for SMARTS templates, using specialization, generalization, combinations, and permutations of atom patterns to introduce chemically consistent diversity and improve model robustness.

## II. RELATED WORK

Most of the recent literature on template-based approaches in reaction prediction has focused on graph-based models. [22], [23]. However, to the best of our knowledge, the potential of Transformer models for template-based sequence prediction has yet to be explored.

Template-free, sequence-based models have achieved impressive results on the USPTO MIT benchmark, holding the current state-of-the-art in the single-step product prediction task [8]. However, these models face significant challenges in terms of applicability. The USPTO MIT dataset, derived from patented reactions, captures only a fraction of the diversity and complexity found in real-world organic synthesis, leaving large regions of the chemical space unexplored. As a result, while template-free models perform well in generating reaction outcomes, they struggle to generalize to the discovery of novel molecules or the prediction of reaction outcomes that fall outside the dataset [20].

Notable advancements in this domain include Molecular Transformer [6], which used a smaller version of the base Transformers architecture [4]. The model was trained on both forward and backward tasks. This was the first application of Transformers to the single-step reaction prediction task. Augmented Transformer [7] used an extensive data augmentation on input SMILES and demonstrated that doing so increased the model’s generalization. Chemformer [8], on the other hand, took things even further by proposing a much larger BART [24] model with special pretraining. The pretraining included masking and data augmentation, making the model more robust and increasing prediction accuracy. While these template-free Transformer models have demonstrated remarkable success in reaction prediction, the exploration of templatebased sequence-to-sequence models for this task remains an underexplored area, leaving room for further development in this domain.

The lack of real-world applications of existing reaction prediction models reveals a critical weakness: their inability to generalize beyond narrow, benchmark-specific patterns. This lack highlights the need for a dataset with generic reactions, offering a more versatile training ground for reaction prediction models. This would allow models to explore the entire chemical space, ultimately advancing the field beyond the limitations of current benchmarks.

## III. DATASETS

Three datasets are used in this work: the USPTO MIT dataset [19]; BRS-Base, a dataset constructed using the proposed BRS generic reaction templates, one of the key contributions of this work; and BRS-Aug, a SMARTS-augmented version of the base training dataset, generated using the novel augmentation strategy proposed in this study, a second major contribution. The USPTO MIT dataset contains reactions, along with the corresponding reactants, reagents, and products extracted from patents, represented in SMILES notation. The USPTO MIT dataset includes highly specific reaction templates, valid only for the exact combination of reactants, reagents, and products. It is divided into two subsets: USPTO MIT Mixed, which does not distinguish between reactants and reagents and is considered a slightly more challenging problem, and USPTO MIT Separated, which separates reagents from reactants.


TABLE I: Generic Reaction Patterns from the Broad Reaction Set (BRS)




<table><tr><td rowspan=1 colspan=4>SMARTS Notation</td></tr><tr><td rowspan=1 colspan=1>#</td><td rowspan=1 colspan=1>Constructive Reactions</td><td rowspan=1 colspan=1>#</td><td rowspan=1 colspan=1>Destructive Reactions</td></tr><tr><td rowspan=1 colspan=1>1</td><td rowspan=1 colspan=1><eq>[ \# 6 , \# 7 , \# 8 ; \hbar : 1 ] \cdot [ 0 , \mathtt { N } , \mathtt { F } , \mathtt { C } : 2 ] > > [ \# 6 , \# 7 , \# 8 : 1 ] \ [ 0 , \mathtt { N } , \mathtt { F } , \mathtt { C } : 2 ]</eq></td><td rowspan=1 colspan=1>11</td><td rowspan=1 colspan=1><eq>[ \# 6 , \# 7 , \# 8 : 1 ] \ [ 0 , \mathrm { N } , \mathrm { F } , \mathbb { C } : 2 ] > > [ \# 6 , \# 7 , \# 8 ; \mathrm { h } : 1 ]</eq></td></tr><tr><td rowspan=1 colspan=1>2</td><td rowspan=1 colspan=1><eq>[ 0 , \mathrm { N } , \mathsf { C } ; \mathrm { h } : 1 ] \ [ 0 , \mathrm { N } , \mathsf { C } ; \mathrm { h } : 2 ] > > [ 0 , \mathrm { N } , \mathsf { C } : 1 ] = [ 0 , \mathrm { N } , \mathsf { C } : 2 ]</eq></td><td rowspan=1 colspan=1>12</td><td rowspan=1 colspan=1><eq>[ 0 , \mathrm { N } , \mathrm { C } ; 1 ] = [ 0 , \mathrm { N } , \mathrm { C } ; 2 ] > > [ 0 , \mathrm { N } , \mathrm { C } ; \mathrm { h } : 1 ] \ [ 0 , \mathrm { N } , \mathrm { C } ; \mathrm { h } : 2 ]</eq></td></tr><tr><td rowspan=1 colspan=1>3</td><td rowspan=1 colspan=1><eq>[ \mathrm { N } , \mathrm { C } ; \mathrm { h } 2 : 1 ] ~ [ \mathrm { N } , \mathrm { C } ; \mathrm { h } 2 : 2 ] > > [ \mathrm { N } , \mathrm { C } : 1 ] \# ~ [ \mathrm { N } , \mathrm { C } : 2 ]</eq></td><td rowspan=1 colspan=1>13</td><td rowspan=1 colspan=1><eq>[ \mathrm { N } , \mathsf { C } : \mathrm { 1 } ] \# [ \mathrm { N } , \mathsf { C } : 2 ] > > [ \mathrm { N } , \mathsf { C } ; \mathrm { h } 2 : \mathrm { 1 } ] \ [ \mathrm { N } , \mathsf { C } ; \mathrm { h } 2 : 2 ]</eq></td></tr><tr><td rowspan=1 colspan=1>4</td><td rowspan=1 colspan=1><eq>[ \mathsf { C } ; \mathsf { h } \colon \mathsf { 1 } ] = [ \mathrm { N } , \mathsf { C } ; \mathsf { h } \colon \mathsf { 2 } ] > > [ \mathsf { C } \colon \mathsf { 1 } ] \# \ [ \mathrm { N } , \mathsf { C } \colon \mathsf { 2 } ]</eq></td><td rowspan=1 colspan=1>14</td><td rowspan=1 colspan=1><eq>[ \mathsf { C } : 1 ] \neq [ \mathsf { N } , \mathsf { C } : 2 ] > > [ \mathsf { C } \colon \mathrm { h } : 1 ] = [ \mathrm { N } , \mathsf { C } : \mathrm { h } : 2 ]</eq></td></tr><tr><td rowspan=1 colspan=1>5</td><td rowspan=1 colspan=1><eq>[ \# 6 , \# 7 , \# 8 ; \hbar : 1 ] \sim [ \star : 2 ] \sim [ \# 6 , \# 7 , \# 8 ; \hbar : 3 ] > ></eq><eq>[ \# 6 , \# 7 , \# 8 : 1 ] 1 [ \star : 2 ] \sim [ \# 6 , \# 7 , \# 8 : 3 ] 1</eq></td><td rowspan=1 colspan=1>15</td><td rowspan=1 colspan=1><eq>[ \# 6 , \# 7 , \# 8 : 1 ] 1 [ \star : 2 ] \sim [ \# 6 , \# 7 , \# 8 : 3 ] 1 > ></eq><eq>[ \# 6 , \# 7 , \# 8 ; \mathrm { h } : 1 ] \sim [ \star : 2 ] \sim [ \# 6 , \# 7 , \# 8 ; \mathrm { h } : 3 ]</eq></td></tr><tr><td rowspan=1 colspan=1>6</td><td rowspan=1 colspan=1><eq>[ \# 6 , \# 7 , \# 8 ; \hbar : 1 ] \sim [ \star : 2 ] \sim [ \star : 4 ] \sim [ \# 6 , \# 7 , \# 8 ; \hbar : 3 ] > ></eq><eq>[ \# 6 , \# 7 , \# 8 : 1 ] 1 [ \star : 2 ] \sim [ \star : 4 ] \sim [ \# 6 , \# 7 , \# 8 : 3 ] 1</eq></td><td rowspan=1 colspan=1>16</td><td rowspan=1 colspan=1><eq>[ \# 6 , \# 7 , \# 8 : 1 ] 1 [ \star : 2 ] \sim [ \star : 4 ] \sim [ \# 6 , \# 7 , \# 8 : 3 ] 1 > ></eq><eq>[ \# 6 , \# 7 , \# 8 ; \hbar : 1 ] \sim [ \star : 2 ] \sim [ \star : 4 ] \sim [ \# 6 , \# 7 , \# 8 ; \hbar : 3 ]</eq></td></tr><tr><td rowspan=1 colspan=1>7</td><td rowspan=1 colspan=1><eq>[ \# 6 , \# 7 , \# 8 ; \hbar : 1 ] \sim [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \# 6 , \# 7 , \# 8 ; \hbar : 3 ] > > 0 .</eq><eq>[ 0 , \mathrm { N } , \mathord { \mathbb { C } } : \mathrm { 1 } ] \mathrm { 1 } [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \# 6 , \# 7 , \# 8 : 3 ] \mathrm { 1 }</eq></td><td rowspan=1 colspan=1>17</td><td rowspan=1 colspan=1><eq>[ 0 , \mathrm { N } , \mathsf { C } : 1 ] 1 [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \# 6 , \# 7 , \# 8 : 3 ] 1 > ></eq><eq>[ \# 6 , \# 7 , \# 8 ; \hbar : 1 ] \sim [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \# 6 , \# 7 , \# 8 ; \hbar : 3 ]</eq></td></tr><tr><td rowspan=1 colspan=1>8</td><td rowspan=1 colspan=1><eq>[ \# 6 , \# 7 , \# 8 ; \mathrm { h } : 1 ] \sim [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \star : 6 ] \sim </eq><eq>\begin{array} { r l } & { [ \# \ 6 , \# 7 , \# 8 ; \hbar : 3 ] > > [ 0 , \mathrm { N } , \mathsf { C } : 1 ] 1 [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \star : 6 ] } \\ & { \sim \quad [ \# 6 , \# 7 , \# 8 : 3 ] 1 } \end{array}</eq></td><td rowspan=1 colspan=1>18</td><td rowspan=1 colspan=1><eq>\begin{array} { r } { [ 0 , \mathrm { N } , \mathsf { C } : \mathrm { 1 } ] \mathrm { 1 } [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \star : 6 ] \sim [ \# 6 , \# 7 , \# 8 : 3 ] \mathrm { 1 } [ \star : 2 ] \sim [ \star : 6 ] \sim [ \star : 6 ] \sim [ \star : 7 ] \sim [ \star : 3 ] \mathrm { 1 } [ \star : 2 ] . } \end{array}</eq><eq>\begin{array} { r l } & { > > [ \# 6 , \# 7 , \# 8 ; \hbar : 1 ] \sim [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \star : 6 ] \sim } \\ & { [ \# 6 , \# 7 , \# 8 ; \hbar : 3 ] } \end{array}</eq></td></tr><tr><td rowspan=1 colspan=1>9</td><td rowspan=1 colspan=1><eq>[ \# 6 , \# 7 , \# 8 ; \hbar : 1 ] \sim [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \star : 6 ] \sim [ \star : 7 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ] \sim [ \star : 1 ]</eq><eq>\begin{array} { r l } & { [ \# 6 , \# 7 , \# 8 ; \hbar : 3 ] > > [ 0 , \mathrm { N } , \mathsf { C } : 1 ] 1 [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \star : 6 ] } \\ & { \sim [ \star : 7 ] \sim [ \# 6 , \# 7 , \# 8 : 3 ] 1 } \end{array}</eq></td><td rowspan=1 colspan=1>19</td><td rowspan=1 colspan=1><eq>[ 0 , \mathrm { N } , \mathord { \mathbb { C } } : \mathrm { 1 } ] \mathrm { 1 } [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \star : 6 ] \sim [ \star : 7 ] \sim</eq><eq>[ \# 6 , \# 7 , \# 8 : 3 ] 1 > > [ \# 6 , \# 7 , \# 8 ; \mathrm { h } : 1 ] \sim [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ]</eq><eq>\sim [ \star : 6 ] \sim [ \star : 7 ] \sim [ \# 6 , \# 7 , \# 8 ; \mathrm { h } : 3 ]</eq></td></tr><tr><td rowspan=1 colspan=1>10</td><td rowspan=1 colspan=1><eq>[ \# 6 , \# 7 , \# 8 ; \hbar : 1 ] \sim [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \star : 6 ] \sim [ \star : 7 ] \sim [ \star : 1 ] \sim [ \star : 3 ]</eq><eq>[ { \star \vdots 8 } ] \sim [ \# 6 , \# 7 , \# 8 ; \hbar \colon 3 ] > > [ 0 , \mathrm { N } , \mathsf { C } \colon 1 ] \mathbb { 1 } [ { \star \colon } 2 ] \sim [ { \star \colon } 4 ] \sim [ { \star \colon } 5 ]</eq><eq>\sim [ \star : 6 ] \sim [ \star : 7 ] \sim [ \star : 8 ] \sim [ \# 6 , \# 7 , \# 8 : 3 ] 1</eq></td><td rowspan=1 colspan=1>20</td><td rowspan=1 colspan=1><eq>[ 0 , \mathbb { N } , \mathbb { C } : 1 ] ] 1 [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ] \sim [ \star : 6 ] \sim [ \star : 7 ] \sim [ \star : 8 ]</eq><eq>\sim [ \# 6 , \# 7 , \# 8 : 3 ] 1 > > [ \# 6 , \# 7 , \# 8 ; \hbar : 1 ] \sim [ \star : 2 ] \sim [ \star : 4 ] \sim [ \star : 5 ]</eq><eq>\sim [ \star : 6 ] \sim [ \star : 7 ] \sim [ \star : 8 ] \sim [ \# 6 , \# 7 , \# 8 ; \mathrm { h } : 3 ]</eq></td></tr></table>




Note: The greater-than signs (>>) separates reactants from products, while a dot (.) distinguishes individual molecules. #n represents any atom with the atomic number n, and specific letters indicate particular chemical environments; : n is used to map and track specific subgraphs within the reaction. For more information on the SMARTS notation, refer to [17].


In this study, we worked with the USPTO MIT Mixed dataset with the standard train/validation/test split of approximately 409K, 30K, and 40K examples, respectively.

## A. Proposed Reaction Set: Broad Reaction Set

In this study, we introduce 20 new generic reaction templates, as shown in Table I. Ten of these reactions are constructive, and the other ten are destructive, represented in SMARTS notation. These reactions are inspired by those used in an evolutionary algorithm named EvoMol [26], which demonstrated efficiency in exploring the chemical space [27]. These reactions serve as foundational building blocks for constructing reaction prediction datasets similar to USPTO. Since these reactions can be applied to a wide range of molecules, they offer significant flexibility for use with publicly available or commercial molecular datasets.

Destructive reactions, the reverse of constructive reactions, enable a return to an earlier stage in the chemical space, offering the possibility to explore alternative pathways. Constructive and destructive reactions are symmetrical.

Here’s what each reaction from Table I does:

• Reactions 1 & 11: The constructive reaction (#1) involves a molecule with an atom such as C, N, or O, bonded to hydrogen, reacting with a functional group containing O, N, F, or C. The functional group is added to the reactant. In contrast, the destructive reaction (#11) removes a functional group containing O, N, F, or C and replaces it with a hydrogen atom.

• Reactions 2 & 12: The constructive reaction (#2) takes a molecule with a single bond between O, N, or C atoms which are bonded to H and forms a double bond instead. The destructive reaction (#12) breaks a double bond between those same heavy atoms, replacing it with a single bond.

• Reactions 3 & 13: The constructive reaction (#3) takes a molecule with a single bond between N and C atoms, each bonded to two hydrogen atoms, and replaces this bond with a triple bond between these atoms, breaking the bond of one hydrogen atom for each. The destructive reaction (#13) breaks the triple bond and adds a hydrogen atom to each heavy atom that forms the bond.

• Reactions 4 & 14: The constructive reaction (#4) takes a molecule with a C atom bonded to a H. This C atom contains a double bond with a N or C atom, which in turn is also bonded to at least one H. The reaction transforms the double bond into a triple bond. The destructive reaction (#14) takes a molecule with a triple bond between a C atom and a N or C atom and breaks this triple bond into a double bond.

The remaining reactions focus on the creation or destruction of cycles of various sizes and will be explained together:

• Reactions 5 – 10 & 15 – 20: The constructive reactions (#5 – #10) involve a molecule with a linear structure where an atom C, N or O bonded to H is connected to one (for reaction 5) up to six (for reaction 10) wildcard atoms (any atom), forming a cyclic structure by bonding the atom at position :1 with the atom at position :3 to close the ring. The destructive reactions (#15 – #20) involve a molecule with a cycle of size 3 (for reaction 15) up to 8 (for reaction 20) and they break the cycle.

With their highly generic patterns, these reactions can be applied to a wide range of molecules, as well as different substructures within the same molecule. This makes the reaction set extremely flexible and well-suited for exploring chemical space. It is argued that these 20 reactions provide a solid foundation for starting with the simplest molecules and exploring a significant portion of the chemical space.

For simplicity, the transformations defined in these reactions are currently limited to atoms C, N, O, and F. However, this does not imply that the reactions cannot be applied to molecules containing other atoms. It simply means that only the reactivity of these four atoms is considered, and transformations will occur exclusively between them within the molecule. Additionally, reactions constructing cycles up to size 8 were defined. This limitation is partly due to challenges in defining reactions that can generate cycles of arbitrary size using SMARTS notation, but also because cycles larger than size 8 are rare. Moreover, chemists have proposed metrics that try to assess the synthesizability of a molecular graph, such as SAScore [28], where large cycles are penalized.

Despite these limitations, the defined reactions allow us to explore a significant portion of the chemical space. With minor modifications, these reactions can be extended to include additional atoms and cover a larger part of the chemical space, exceeding the limits set by the current definition. For the time being, the limitations we have set still enable us to explore the chemical space.

## B. Dataset Construction

To construct the dataset used in this study, reactants were randomly sampled from two publicly available sources: EVO10 [29], which enumerates all possible molecules with up to 10 atoms of C, N, O, F, or S; and ChEMBL34 [31], a large-scale dataset of bioactive, drug-like molecules. ChEMBL34 was filtered to retain only molecules containing the same atom types as EVO10, ensuring chemical consistency and relevance across sources. The dataset was created using molecules sampled from these two sources. For each reaction in the template set, a molecule was randomly selected and evaluated for compatibility with the input pattern. If the structure matched, the reaction was executed using RDKit [25], an open-source cheminformatics library. If the reaction produced valid products, a series of filtering steps was applied to eliminate unrealistic outcomes commonly introduced by generic BRS templates. First, only canonical SMILES were retained. Then, we applied the filtering criteria from [29]: one filter removed molecules containing substructures not found in real-world compound datasets such as ChEMBL and ZINC [30]; the other excluded products containing Generic Cyclic Features (GCF), molecular ring scaffolds not observed in those datasets. Products that passed these filters were deemed realistic. To promote structural diversity, we retained multiple products for the same reactant–reaction combination, allowing the model to learn that a single input may correspond to multiple plausible outcomes. This resulted in the generation of the BRS-Base dataset consisting of 220K training, 10K validation, and 10K test examples. Much larger datasets can also be generated by applying the BRS templates to additional molecular sources.

## C. Data Augmentation Strategy for SMARTS Templates

In this study, a new data augmentation strategy for SMARTS templates is presented. To the best of our knowledge, this is the first attempt to augment this notation. Acquiring highquality reaction templates is challenging, and in such cases, as in many other machine learning domains, data augmentation becomes a valuable tool. While previous work has successfully applied augmentation techniques to molecular SMILES representations, leading to improved performance in templatefree models [7], [8], [32], no such strategy has been proposed for SMARTS. Inspired by these efforts, we introduce a novel augmentation framework tailored to SMARTS templates. This is particularly important in our setting, where the number of base templates is limited to just 20. Without augmentation, the model may struggle to grasp the syntax and semantics of the SMARTS language from such a small and rigid set, potentially resulting in a model that merely memorizes 20 isolated input–output transformations. Our augmentation strategy addresses this limitation by introducing chemically sound diversity into the templates, promoting generalization across reactions, and encouraging the model to learn the underlying semantics of the transformations rather than surface-level patterns.

The transformations applied to the SMARTS templates fall into four main categories:

• Specialization: In SMARTS, atoms can be represented by their atomic numbers using the # symbol. For example, #6 matches any carbon atom. We specialize these general representations by replacing them with specific forms such as C (a carbon atom outside of a ring) or c (a carbon atom within a ring). This transformation restricts the template to apply only to cyclic or non-cyclic structures, introducing meaningful variation.

• Generalization: Conversely, specific atom types like C or c can be generalized back to their atomic number form, such as #6, allowing the template to match a broader range of reactants. While the actual chemical context may vary, this transformation preserves the previous reaction mechanism and increases the model’s exposure to syntactic diversity.

• Permutation: Atoms listed within SMARTS brackets, e.g., [#7, #8, #6; h:1], can be permuted without changing the chemical meaning. We apply permutations both within atom groups and between bracketed groups. For example, [#6, #7, #8; h:2].[O, N, F, C:1] can be swapped to [O, N, F, C:1].[#7, #8, #6; h:2]. These permutations increase syntactic diversity while preserving reactivity.

• Combination: We generate multiple combinations of atom classes within SMARTS patterns. For instance, starting from [#6, #7, #8; h:1], we can create variants such as [#8; h:1], [#6, #7; h:1], and others. These combinations further expand the expressiveness of the templates.

There are important considerations when applying these transformations. Except for permutation, whenever a transformation is applied to the input (left-hand side) template, the same transformation must also be applied to the output (right-hand side) template. This is essential because, in chemical reactions, the atoms present in the input molecules persist in the output molecules, and maintaining consistency ensures chemical validity. In contrast, permutation only alters the order of atoms or groups within the SMARTS pattern without changing their identity or role, so it does not require a corresponding change in the output template. Each augmented template must be validated using RDKit [25] to ensure chemical correctness. Using these augmentation strategies, the size of the training dataset is doubled: the original entries are retained, and their augmented template versions are added. This results in a training set of 440K examples, referred to as BRS-Aug.

## IV. METHOD

## A. Model and Implementation Details

The general architecture of ProPreT5 is illustrated in Figure 1. A T5 model was chosen for its ease of use, relatively lightweight architecture, and ability to handle large datasets even with modest training resources. The model is very similar to the original T5 [21], encompassing an encoder-decoder structure. The encoder and decoder blocks each consist of 6 layers with a hidden size of 512. Each block includes self-attention and feed-forward layers, with 8 attention heads. Feed-forward layers have an intermediate size of 2048 and use ReLU activation. In addition to these layers, the decoder includes cross-attention layers and masked self-attention. Relative positional embeddings are also used to capture token relationships.

Both the encoder and decoder share a vocabulary embedding layer with a vocabulary size of 243 tokens, as both the input and output use the same notation. The relatively small vocabulary size results from character-level tokenization, which enhances ProPreT5’s flexibility. This approach allows most datasets to be used without retraining the model, unless a new character is added, unlikely given that the vocabulary covers a substantial portion of known chemistry. Characterlevel tokenization was selected to address the challenge of ensuring pretrained models have the correct tokens, as adding and fine-tuning new tokens is costly.

As demonstrated in Figure 1, the reactants and the reaction are distinguished with a separation token used to separate both the reactants from one another and the reaction from the reactants. Additionally, type embeddings are applied to each input, following the approach in [10]. These embeddings distinguish between different input and output types, making it easier to incorporate new entry types, such as reagents or environmental conditions, without confusing the model. A separate trainable embedding layer is used to map these type tokens to embedding vectors. ProPreT5 is trained separately to make predictions in both template-free and template-based settings: in the template-free setting, reaction templates are excluded from the encoder input; in the template-based setting, the model has access to the reaction template as part of the input.

## B. Computational Resources and Training Setup

The training and evaluation of ProPreT5 were completed on a high-performance computing cluster equipped with NVIDIA V100 GPUs with 32 GB of memory, providing sufficient capacity to handle large datasets. ProPreT5 supports distributed training and was trained in parallel on 4 nodes, each equipped with 4 GPUs, for a total of 6 hours. Unlike other models that require extensive computational resources and longer training times, this setup was relatively lightweight and time-efficient. Despite the short training duration, ProPreT5 achieved competitive performance.

## V. RESULTS AND DISCUSSION

ProPreT5 was trained in both template-free and templatebased settings. While the USPTO MIT Mixed benchmark is almost exclusively addressed in the template-free setting in the current literature, our use of this setting served primarily as a sanity check. We applied template-free training on USPTO MIT Mixed not to improve upon existing baselines, but to verify that ProPreT5 behaved as expected and achieved performance reasonably aligned with prior work. This step was essential to confirm that the model was functioning correctly before applying it to the more challenging and novel dataset, which is the primary focus of this study.

## A. Product Prediction on USPTO MIT

In the template-free setting using the USPTO MIT Mixed dataset, we followed the standard approach in the literature where product prediction is performed without access to a reaction template. To improve generalization, we augmented the input molecules by a factor of four using non-canonical SMILES, as proposed in [32]; multiple non-canonical forms of each reactant were paired with the same product. This data augmentation is often employed in the existing literature [6]– [8]. On the other hand, unlike some of the existing studies that rely on costly pretraining strategies, our model was trained from scratch, directly on USPTO MIT Mixed.

Table II presents the exact match accuracy of different models trained on the USPTO MIT Mixed dataset. For this dataset, each reactant-reaction combination corresponds to exactly one product, so if the model did not generate that specific product, the prediction was considered incorrect.

![](images/568a4100ac74c8fc7a28acaca91385e4e1f753367148c37ddb553754a7643a4b.jpg)



Fig. 1: ProPreT5 Architecture.


As shown in Table II, after only a few hours of training on a relatively economical setup, ProPreT5 achieved an exact match accuracy of 87.9% in the template-free setting on the USPTO MIT Mixed benchmark. This result is particularly notable given that the other three models required extensive training over hundreds of epochs. The accuracy was sufficient to confirm that the model was functioning as expected and ready to be applied to the more ambitious BRS dataset.

We also explored the template-based setting for the same benchmark. However, the other models could not be evaluated in this setting, as they lacked support for reaction template tokens. Introducing new tokens and retraining those models would have required significant effort and computational resources. However, ProPreT5 achieved a near-perfect accuracy of 99.8% in the template-based setting on USPTO MIT Mixed, supporting our earlier claim that the templates in this benchmark are highly specific and deterministic, effectively enumerating the atoms in the product.

## B. Product Prediction on BRS

Predicting reaction products for the dataset generated using the reactions from BRS is inherently more complex than for the USPTO MIT Mixed dataset. Unlike the highly specific templates in USPTO, the BRS templates are generic and do not explicitly enumerate the input or output molecules. Instead, they describe general transformation mechanisms that must be learned and generalized across diverse molecular contexts. The model must not only understand these transformations but also recognize that they can apply to a wide variety of molecules and to different regions within a single molecule. By design, this makes the task significantly more challenging. Using BRS templates, a single reactant-reaction combination can lead to multiple possible products, similar to how multiple correct translations can exist for a machine translation task. Therefore, in the case of BRS, a generation is considered correct if the model predicted any one of the possible products. It is important to note that, in this setting, no training sample shares the same reactant–reaction input as any test sample, a condition we carefully ensured.


TABLE II: Prediction Accuracy on USPTO MIT Mixed




<table><tr><td>Model</td><td>Template-based</td><td>Template-free</td></tr><tr><td>Molecule Transformer</td><td></td><td>88.6% [6]</td></tr><tr><td>Augmented Transformer</td><td></td><td>90.0% [7]</td></tr><tr><td>Chemformer</td><td></td><td>90.9% [8]</td></tr><tr><td>ProPreT5</td><td>99.8%</td><td>87.9%</td></tr></table>




Note: Template-based comparisons were omitted because none of the baseline models natively support reaction templates, and extending them with new tokens and retraining poses non-trivial challenges. Results with citations were directly taken from the corresponding papers.


The difficulty of the task increases further in the absence of reaction templates. Since a single molecule can serve as a reactant in many distinct reactions, the model lacks critical contextual cues and must rely on general transformation patterns. As a result, predictions become less reliable: the model may propose a chemically plausible product, but one that does not correspond to the specific reaction intended to produce the target product. This limitation is evident in the template-free results on the BRS-Base dataset shown in Table III, where both models achieve prediction accuracies below 70%.

For the template-free comparison, we selected Chemformer [8], as its code and trained weights were publicly available and it achieved the highest reported Top-1 accuracy on the USPTO MIT Mixed benchmark. To evaluate its performance on our benchmark, we fine-tuned Chemformer without reaction templates on the BRS-Base training set. Using BRS-Aug training set in the template-free setting is unnecessary, as the only difference from BRS-Base lies in the reaction templates, which are excluded in this configuration. The underwhelming accuracy by both models in the template-free setting highlights a key limitation: in real-world scenarios where a single reactant can participate in a wide range of reactions, models trained without templates may lack the reliability needed for accurate prediction.


TABLE III: Prediction Accuracy on BRS




<table><tr><td>Training</td><td>Reaction Template</td><td>Chemformer [8]</td><td>ProPreT5</td></tr><tr><td>BRS-Base</td><td>Template-free</td><td>69.2%</td><td>68.8%</td></tr><tr><td>BRS-Base</td><td>Template-based</td><td></td><td>91.2%</td></tr><tr><td>BRS-Aug</td><td>Template-based</td><td></td><td>95.1%</td></tr></table>



Note: Comparisons were not provided for the template-based versions, as Chemformer [8] does not support reaction templates by default, and adding new tokens followed by retraining the model would be prohibitively expensive. The template-based result on BRS-Base was obtained by fine-tuning Chemformer on top of its existing training on the USPTO MIT Mixed dataset. The reported accuracies are based on the BRS-Base test set, while template augmentation (BRS-Aug) is applied only during training to improve prediction performance.

When it comes to template-based prediction, which is the main challenge addressed in this paper, we aim to propose a language model capable of handling and understanding the SMARTS notation. This capability is essential not only for accurate product prediction but also for enabling a variety of downstream tasks in the future. To evaluate this, we first trained the model on the non-augmented version of the dataset BRS-Base. The model achieved a solid accuracy of 91.2% on the test set. However, given the limited number of reaction templates, there is a risk that the model simply memorizes the reactions rather than learning the underlying transformation rules encoded in the SMARTS notation.

To address this concern, we trained the model on the augmented version of the training set BRS-Aug. This version includes multiple syntactic variants of each reaction template as explained in detail in Section III-C, providing greater diversity and encouraging the model to generalize. As a result, the model’s accuracy improved to 95.1% on the same test set, indicating that the augmentation strategy indeed helps the model capture a more nuanced understanding of the reaction rules.

This effect becomes particularly evident when we assess the model’s robustness by removing a specific reaction template from the training set, specifically, Reaction 5 from Table I, along with all its augmented variants. As shown in Table IV, the model trained on the non-augmented BRS-Base dataset without the Reaction 5 suffers a significant drop in performance when evaluated on that same reaction, suggesting that it had overfitted to the limited examples without truly learning the SMARTS syntax. In contrast, the model trained with augmented templates maintains much better performance, providing strong evidence that the augmentation strategy enhances generalization and improves the model’s ability to learn the SMARTS language in a meaningful way.


TABLE IV: Prediction Accuracy of ProPreT5 on Reaction 5 Removed from Training Set



Note: Reaction 5 and all its augmented variants were removed from the training sets. The table reports the model’s accuracy on test samples involving Reaction 5.




<table><tr><td>Training Subset</td><td>Accuracy on Reaction 5</td></tr><tr><td>BRS-Base without Reaction 5</td><td>23.3%</td></tr><tr><td>BRS-Aug without Reaction 5</td><td>54.7%</td></tr></table>



## VI. CONCLUSION

In this study, we introduced the Broad Reaction Set (BRS), a novel collection of generic reaction templates designed to provide a more realistic and versatile benchmark for reaction prediction. This contribution addresses key limitations of widely used datasets such as USPTO, which rely on overly specific reaction templates and therefore limit real-world applicability, an essential requirement in cheminformatics.

We also proposed a novel augmentation strategy for the SMARTS notation, which, to the best of our knowledge, has not been explored previously. This strategy was applied to the BRS templates, resulting in two training sets: BRS-Base, using the original templates, and BRS-Aug, incorporating augmented variants. While developed for the 20 generic reactions presented in this study, the augmentation strategy is generalizable and can be applied to other SMARTS-based reaction templates.

To evaluate the impact of the proposed datasets, we introduced ProPreT5, a flexible T5-based model for reaction product prediction. Its flexibility stems not only from being trained on generic reactions but also from its characterlevel tokenization, which enables seamless adaptation to other datasets without requiring costly retraining. ProPreT5 is a major contribution, as it is the first language model capable of directly handling and applying the SMARTS notation. This opens the door to new applications: thanks to its strong predictive performance, ProPreT5 can serve as a faster and more scalable alternative to RDKit for product prediction, particularly in scenarios where batching is required, something that RDKit’s template application does not support efficiently. Although its accuracy is not yet perfect, ProPreT5 offers a compelling balance of speed and flexibility. Furthermore, it provides a strong baseline for future downstream tasks involving SMARTS-based reasoning.

It is important to emphasize the broader utility of developing models capable of interpreting chemical reactions from generic templates. By learning the underlying rules of chemistry, such models are better prepared for downstream tasks that require a deeper understanding of reaction mechanisms. Moreover, unlike rule-based tools such as RDKit, which often fail when faced with noisy or imperfect input data, these models offer greater flexibility and generalizability. Their ability to handle variability and incomplete information makes them valuable assets for real-world applications where input quality cannot always be guaranteed.

Finally, we showed that satisfactory results can be obtained with lightweight training configurations, avoiding the need for extensive pretraining. In future work, we plan to extend this approach to multi-step synthesis planning, leveraging the template-based framework of ProPreT5. We also aim to further improve prediction accuracy in order to minimize error propagation in multi-step workflows.

## ACKNOWLEDGMENT

This work was supported by the University of Angers, and the French Ministry of Education and Research (JL PhD grant). This work was performed using HPC resources from GENCI-IDRIS (Grant 2024-AD011014840R1)

## CODE AND DATA AVAILABILITY

The code and the data for this work will be made available in the future as they cannot be shared at this time to maintain the anonymity of the submission.

## REFERENCES



[1] Blakemore, David C., et al. ”Organic synthesis provides opportunities to transform drug discovery.” Nature chemistry 10.4 (2018): 383-394.





[2] Stein, Helge S., and John M. Gregoire. ”Progress and prospects for accelerating materials science with automated and autonomous workflows.” Chemical science 10.42 (2019): 9640-9649.





[3] Day, Daniel M., et al. ”Reaction Optimization for Greener Chemistry with a Comprehensive Spreadsheet Tool.” Molecules 27.23 (2022): 8427.





[4] Vaswani, A. ”Attention is all you need.” Advances in Neural Information Processing Systems (2017).





[5] Cambria, Erik, and Bebo White. ”Jumping NLP curves: A review of natural language processing research.” IEEE Computational intelligence magazine 9.2 (2014): 48-57.





[6] Schwaller, Philippe, et al. ”Molecular transformer: a model for uncertainty-calibrated chemical reaction prediction.” ACS central science 5.9 (2019): 1572-1583.





[7] Tetko, Igor V., et al. ”State-of-the-art augmented NLP Transformer models for direct and single-step retrosynthesis.” Nature communications 11.1 (2020): 5575.





[8] Irwin, Ross, et al. ”Chemformer: a pre-trained Transformer for computational chemistry.” Machine Learning: Science and Technology 3.1 (2022): 015022.





[9] Schwaller, Philippe, et al. ”Predicting retrosynthetic pathways using Transformer-based models and a hyper-graph exploration strategy.” Chemical science 11.12 (2020): 3316-3325.





[10] Bagal, Viraj, et al. ”MolGPT: molecular generation using a Transformerdecoder model.” Journal of Chemical Information and Modeling 62.9 (2021): 2064-2076.





[11] Mazuz, Eyal, et al. ”Molecule generation using Transformers and policy gradient reinforcement learning.” Scientific Reports 13.1 (2023): 8799.





[12] Dobberstein, Niklas, Astrid Maass, and Jan Hamaekers. ”Llamol: a dynamic multi-conditional generative Transformer for de novo molecular design.” Journal of Cheminformatics 16.1 (2024): 73.





[13] Wang, Sheng, et al. ”SMILES-BERT: large scale unsupervised pretraining for molecular property prediction.” Proceedings of the 10th ACM international conference on bioinformatics, computational biology and health informatics. 2019.





[14] Chithrananda, Seyone, Gabriel Grand, and Bharath Ramsundar. ”Chem-BERTa: large-scale self-supervised pretraining for molecular property prediction.” arXiv preprint arXiv:2010.09885 (2020).





[15] Ross, Jerret, et al. ”Large-scale chemical language representations capture molecular structure and properties.” Nature Machine Intelligence 4.12 (2022): 1256-1264.





[16] Weininger, David. ”SMILES, a chemical language and information system. 1. Introduction to methodology and encoding rules.” Journal of chemical information and computer sciences 28.1 (1988): 31-36.





[17] Daylight Theory: SMARTS - A Language for Describing Molecular Patterns. https://www.daylight.com/dayhtml/doc/theory/theory.smarts.html. Accessed 10 Jan. 2025.





[18] Lowe, Daniel Mark. Extraction of chemical structures and reactions from the literature. Diss. 2012.





[19] Jin, Wengong, et al. ”Predicting organic reaction outcomes with weisfeiler-lehman network.” Advances in neural information processing systems 30 (2017).





[20] Wei, Yixin, et al. ”Machine learning-assisted retrosynthesis planning: current status and future prospects.” Chinese Journal of Chemical Engineering (2024).





[21] Raffel, Colin, et al. ”Exploring the limits of transfer learning with a unified text-to-text Transformer.” Journal of machine learning research 21.140 (2020): 1-67.





[22] Chen, Shuan, and Yousung Jung. ”Deep retrosynthetic reaction prediction using local reactivity and global attention.” JACS Au 1.10 (2021): 1612-1620.





[23] Yan, Chaochao, et al. ”RetroComposer: composing templates for template-based retrosynthesis prediction.” Biomolecules 12.9 (2022): 1325.





[24] Lewis, Mike. ”Bart: Denoising sequence-to-sequence pre-training for natural language generation, translation, and comprehension.” arXiv preprint arXiv:1910.13461 (2019).





[25] RDKit. https://rdkit.org/. Accessed 23 Jan. 2025.





[26] Leguy, Jules, et al. ”EvoMol: a flexible and interpretable evolutionary algorithm for unbiased de novo molecular generation.” Journal of cheminformatics 12 (2020): 1-19.





[27] Leguy, Jules, et al. ”Surrogate-Based Black-Box Optimization Method for Costly Molecular Properties.” 2021 IEEE 33rd International Conference on Tools with Artificial Intelligence (ICTAI). IEEE, 2021.





[28] Ertl, Peter, and Ansgar Schuffenhauer. ”Estimation of synthetic accessibility score of drug-like molecules based on molecular complexity and fragment contributions.” Journal of cheminformatics 1 (2009): 1-11.





[29] Cauchy, Thomas, Jules Leguy, and Benoit Da Mota. ”Definition and exploration of realistic chemical spaces using the connectivity and cyclic features of ChEMBL and ZINC.” Digital Discovery 2.3 (2023): 736-747.





[30] Irwin, John J., et al. ”ZINC20—a free ultralarge-scale chemical database for ligand discovery.” Journal of chemical information and modeling 60.12 (2020): 6065-6073.





[31] ChEMBL Database, https://www.ebi.ac.uk/chembl/





[32] Bjerrum, Esben Jannik. ”SMILES enumeration as data augmentation for neural network modeling of molecules.” arXiv preprint arXiv:1703.07076 (2017).


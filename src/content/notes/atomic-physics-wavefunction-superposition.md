---
title: "波函数叠加与薛定谔方程"
documentTitle: "原子物理 · 波函数叠加与薛定谔方程 — NOTEBOOK"
description: "态叠加、概率幅、双缝干涉与定态薛定谔方程的物理意义。"
date: "2026-04-20"
subject: "原子物理"
tags: ["原子物理","量子力学"]
readingTime: 12
language: "zh-CN"
legacyPath: "/posts/atomic-physics-wavefunction-superposition.html"
---

<main id="content" class="main">
    <div class="container">

      <div class="note-header">
        <div class="note-meta">
          <span class="tag-cyan">原子物理</span>
          <span class="tag-magenta">量子力学基础</span>
        </div>
        <h1 class="note-title glitch" data-text="波函数叠加与薛定谔方程">波函数叠加与薛定谔方程</h1>
        <p class="note-date">2026-04-20 · 原子物理第三章 · ~3500 words</p>
      </div>

      <!-- 目录 -->
      <div class="toc-box">
        <div class="toc-title">CONTENTS</div>
        <ul class="toc-list">
          <li><a href="#sec1">1. 波函数的态叠加原理</a></li>
          <li><a href="#sec2">2. 四项基本规则</a></li>
          <li><a href="#sec3">3. 物理图像：双缝干涉实验的量子解释</a></li>
          <li><a href="#sec4">4. 必须澄清的混淆点</a></li>
          <li><a href="#sec5">5. 从波函数到薛定谔方程</a></li>
          <li><a href="#sec6">6. 薛定谔方程的性质</a></li>
          <li><a href="#sec7">7. 定态薛定谔方程</a></li>
        </ul>
      </div>

      <!-- 正文 -->
      <div class="note-content">

        <h2 id="sec1" class="section-heading">1. 波函数的态叠加原理</h2>

        <div class="content-section">
          <h3 class="subsection-heading">基本原理的引入</h3>

          <p>在经典物理中，若一个事件可以通过若干互斥途径发生，总概率是各途径概率之和（$P = P_1 + P_2$）。然而量子力学中，微观粒子具有波粒二象性，若从初态 $i$ 到末态 $f$ 的跃迁存在多种<strong>物理上不可区分</strong>的方式，则这些方式不是互斥的，而是<strong>相干</strong>的。</p>

          <p>态叠加原理指出：此时总跃迁概率幅等于各途径概率幅的线性叠加，总概率则是总概率幅模的平方。这一原理是量子力学的基本假设之一，费曼称之为<span class="highlight">"量子力学第一原理"</span>。</p>
        </div>

        <h2 id="sec2" class="section-heading">2. 四项基本规则</h2>

        <div class="content-section">
          <p>考虑从初态 $i$ 到末态 $f$ 的跃迁，用 $\langle f|i\rangle$ 表示跃迁概率幅（相当于波函数 $\psi$），概率 $P = |\langle f|i\rangle|^2$。</p>

          <div class="note-block">
            <h4 class="step-heading">规则一：概率幅叠加规则（态叠加原理的核心）</h4>
            <p>若从 $i$ 到 $f$ 的跃迁存在 $n$ 种物理上不可区分的方式，则总概率幅等于各分概率幅之和：</p>
            <p class="formula-center">$$\langle f|i\rangle = \sum_n \langle f|i\rangle_n$$</p>
            <p><strong>关键理解：</strong>"不可区分"意味着实验上无法判断粒子究竟通过哪种方式到达末态。此时量子干涉发生，最终概率 $|\sum_n \langle f|i\rangle_n|^2$ 包含交叉项（干涉项）。</p>
          </div>

          <div class="note-block">
            <h4 class="step-heading">规则二：互斥末态的概率相加</h4>
            <p>若存在 $n$ 个彼此独立、互不相同的末态 $f_1, f_2, \ldots, f_n$，且关心的是到达<strong>任意</strong>末态的总概率（不关心具体到达哪一个），则总概率等于各末态概率之和：</p>
            <p class="formula-center">$$|\langle f|i\rangle|^2 = \sum_n |\langle f|i\rangle_n|^2$$</p>
            <p><strong>关键理解：</strong>这与经典概率论一致。当末态可区分时（如用探测器确定粒子到达 $f_1$ 还是 $f_2$），概率幅不再相干叠加，而是概率直接相加。</p>
          </div>

          <div class="note-block">
            <h4 class="step-heading">规则三：中间态的分段乘积</h4>
            <p>若从 $i$ 到 $f$ 的跃迁必须经过某一中间态 $v$，则总概率幅等于分段概率幅之乘积：</p>
            <p class="formula-center">$$\langle f|i\rangle = \langle f|v\rangle \langle v|i\rangle$$</p>
            <p><strong>关键理解：</strong>这类似于路径积分中经过特定中间点的振幅计算，反映量子跃迁的"过程性"。</p>
          </div>

          <div class="note-block">
            <h4 class="step-heading">规则四：独立粒子体系的联合振幅</h4>
            <p>对于两个独立的微观粒子组成的体系，若粒子1发生 $i \to f$ 跃迁，粒子2同时发生 $I \to F$ 跃迁，则体系的总跃迁概率幅等于个别粒子概率幅之乘积：</p>
            <p class="formula-center">$$\langle fF|iI\rangle = \langle f|i\rangle \langle F|I\rangle$$</p>
            <p><strong>关键理解：</strong>独立性意味着两粒子无相互作用，其概率幅可分离变量。</p>
          </div>
        </div>

        <h2 id="sec3" class="section-heading">3. 物理图像：双缝干涉实验的量子解释</h2>

        <div class="content-section">
          <p>以电子双缝干涉为例阐明上述规则：</p>

          <h4 class="step-heading">1. 单缝情况（可区分路径）</h4>
          <ul class="styled-list">
            <li>仅开缝1：电子从源 $S$ 经缝1到达屏上 $x$ 点的概率幅 $\langle x|S\rangle_1 = \langle x|1\rangle\langle 1|S\rangle = \varphi_1$</li>
            <li>仅开缝2：概率幅 $\langle x|S\rangle_2 = \langle x|2\rangle\langle 2|S\rangle = \varphi_2$</li>
            <li>对应强度分布 $I_1(x) = |\varphi_1|^2$ 和 $I_2(x) = |\varphi_2|^2$</li>
          </ul>

          <h4 class="step-heading">2. 双缝齐开（不可区分路径）</h4>
          <p>当两缝同时打开，实验上无法判断电子究竟通过缝1还是缝2，适用<strong>规则一</strong>，总概率幅为两者之和：</p>
          <p class="formula-center">$$\langle x|S\rangle = \varphi_1 + \varphi_2$$</p>

          <p>屏上电子强度分布为：</p>
          <p class="formula-center">$$I_{12}(x) = |\varphi_1 + \varphi_2|^2 = |\varphi_1|^2 + |\varphi_2|^2 + \varphi_1^*\varphi_2 + \varphi_1\varphi_2^*$$</p>

          <p>其中后两项为<strong>干涉项</strong>，正是这两项导致了明暗相间的干涉条纹。</p>

          <h4 class="step-heading">3. 观测效应（路径可区分性）</h4>
          <p>若在双缝旁放置光源和探测器试图"观察"电子通过哪条缝：</p>
          <ul class="styled-list">
            <li>若光子能明确区分电子路径（如仅在缝1处探测到光子），则路径成为可区分事件</li>
            <li>此时适用<strong>规则二</strong>（互斥末态），总概率为 $|\varphi_1|^2 + |\varphi_2|^2$，干涉项消失，回到经典强度叠加</li>
            <li><strong>物理本质：</strong>测量行为引入了不可区分性向可区分性的转变，破坏了相干叠加</li>
          </ul>
        </div>

        <h2 id="sec4" class="section-heading">4. 必须澄清的混淆点</h2>

        <div class="content-section">
          <div class="note-block note-important">
            <h4 class="step-heading">混淆点1：概率幅叠加 ≠ 概率叠加</h4>
            <p>这是量子与经典最根本的区别。经典物理中，若事件可通过方式1或方式2发生，总概率 $P = P_1 + P_2$。量子物理中，是<strong>概率幅</strong>相加 $\psi = \psi_1 + \psi_2$，概率为 $|\psi|^2 = |\psi_1|^2 + |\psi_2|^2 + \text{干涉项}$。干涉项的存在是量子相干性的体现。</p>
          </div>

          <div class="note-block">
            <h4 class="step-heading">混淆点2：单个粒子的"自我干涉"</h4>
            <p>双缝干涉实验中，即使将电子流减弱到每次只有一个电子通过，只要累积足够长时间，仍会出现干涉条纹。这说明：</p>
            <ul class="styled-list">
              <li>干涉不是电子与电子之间的相互作用（如电子间库仑力）产生的</li>
              <li>而是<strong>单个电子</strong>同时通过两条路径的概率幅自我干涉</li>
              <li>正如费曼所言："电子自己与自己干涉"</li>
            </ul>
          </div>

          <div class="note-block">
            <h4 class="step-heading">混淆点3：量子叠加与经典波叠加的本质差异</h4>
            <p>虽然数学形式相同（都是线性叠加），但物理本质完全不同：</p>
            <ul class="styled-list">
              <li><strong>经典波：</strong>两列波叠加产生新的物理波，具有新的能量分布。若振幅加倍，能量变为四倍。</li>
              <li><strong>量子波函数：</strong>$\psi_1$ 和 $\psi_2$ 叠加后的 $\psi = C_1\psi_1 + C_2\psi_2$ 不代表新的"物质波"，而是描述粒子可能处于状态1（概率 $|C_1|^2$）或状态2（概率 $|C_2|^2$）的<strong>概率幅</strong>。测量时粒子只会以概率 $|C_1|^2$ 呈现状态1的特征，或以概率 $|C_2|^2$ 呈现状态2的特征，绝不会出现"中间态"。</li>
            </ul>
          </div>

          <div class="note-block">
            <h4 class="step-heading">混淆点4：可区分性的连续过渡</h4>
            <p>"可区分"与"不可区分"不是绝对的，而是连续过渡的：</p>
            <ul class="styled-list">
              <li><strong>完全不可区分</strong>（如不用光子探测）：$\psi_1 = \psi_2$，干涉最大</li>
              <li><strong>完全可区分</strong>（如明确知道电子走哪条缝）：干涉完全消失，$I = I_1 + I_2$</li>
              <li><strong>部分可区分</strong>（如用波长较长的光子探测，定位精度不足）：干涉条纹对比度下降，但仍存在</li>
            </ul>
          </div>

          <div class="note-block">
            <h4 class="step-heading">混淆点5：玻色子与费米子的区别</h4>
            <ul class="styled-list">
              <li><strong>玻色子</strong>（如光子）：大量粒子可占据同一量子态，宏观上可呈现经典电磁波（如激光），此时经典干涉与量子干涉并存，且经典干涉往往"掩盖"量子干涉。</li>
              <li><strong>费米子</strong>（如电子）：受泡利不相容原理限制，不会出现宏观集体效应，其波动性纯粹体现为概率幅的量子干涉。</li>
            </ul>
          </div>

          <div class="note-box">
            <p>态叠加原理揭示了量子世界的本质统计性：我们无法预言单个粒子的具体行为，但可以通过概率幅的叠加精确预言大量事件的统计分布。这种"在不确定性中蕴含确定性"的特征，是量子物理与经典物理的根本分野。</p>
          </div>
        </div>

        <h2 id="sec5" class="section-heading">5. 从波函数到薛定谔方程</h2>

        <div class="content-section">
          <p>在经典物理中，宏观尺度下线性系统自由传播的波通常呈现平面波形式。对于沿 $x$ 方向运动、能量为 $E$、动量为 $p$ 的非相对论自由粒子，其波函数（wave function）可表示为平面波形式：</p>

          <p class="formula-center">$$\Psi(x,t) = \Psi_0 e^{i(kx-\omega t)}$$</p>

          <p>其中 $k$ 为波数，$\omega$ 为角频率，$\Psi_0$ 为振幅。</p>

          <p><span class="highlight">1926年</span>（考试重点），薛定谔（Schrödinger）在此基础上给出了描述微观粒子运动的基本方程——<strong>薛定谔方程</strong>。对于一般情况，含时薛定谔方程写为：</p>

          <p class="formula-center">$$i\hbar \frac{\partial}{\partial t}\Psi(\vec{r},t) = \left[ -\frac{\hbar^2}{2m}\nabla^2 + V(\vec{r},t) \right] \Psi(\vec{r},t)$$</p>

          <h4 class="step-heading">方程各项物理意义：</h4>
          <ul class="styled-list">
            <li>左侧 $i\hbar \frac{\partial}{\partial t}$：能量算符作用于波函数，体现时间演化</li>
            <li>右侧方括号内 $-\frac{\hbar^2}{2m}\nabla^2$：动能算符（$\nabla^2$ 为拉普拉斯算符）</li>
            <li>$V(\vec{r},t)$：势能函数</li>
            <li>$\Psi(\vec{r},t)$：描述粒子在时刻 $t$、位置 $\vec{r}$ 处量子状态的波函数</li>
          </ul>

          <p>该方程是量子力学的基本假设之一，决定了波函数随时间演化的规律。对于一维自由粒子（$V=0$），方程简化为：</p>

          <p class="formula-center">$$i\hbar \frac{\partial \Psi}{\partial t} = -\frac{\hbar^2}{2m}\frac{\partial^2 \Psi}{\partial x^2}$$</p>

          <p>通过分离变量 $\Psi(x,t) = \psi(x)\phi(t)$，可分别得到定态薛定谔方程与能量本征值问题。</p>
        </div>

        <h2 id="sec6" class="section-heading">6. 薛定谔方程的性质</h2>

        <div class="content-section">
          <div class="note-block">
            <h4 class="step-heading">性质1：对时间是一次导数</h4>
            <p>薛定谔方程中，波函数对时间 $t$ 只含一阶导数：</p>
            <p class="formula-center">$$\frac{\partial \psi}{\partial t}$$</p>
            <p>这意味着：</p>
            <ul class="styled-list">
              <li>只要给定某一初始时刻的波函数 $\psi(\mathbf r,0)$</li>
              <li>原则上就能唯一确定它以后随时间的演化</li>
            </ul>
            <p>也就是说，<strong>初态一旦确定，后续演化就确定</strong>。这和经典力学里"给定初始条件后，体系未来运动由动力学方程决定"是类似的。只不过经典力学确定的是粒子轨道 $x(t)$，量子力学确定的是波函数 $\psi(\mathbf r,t)$ 的演化。</p>
          </div>

          <div class="note-block">
            <h4 class="step-heading">性质2：对时间一阶、对空间二阶，二者不对称</h4>
            <p>薛定谔方程中：</p>
            <ul class="styled-list">
              <li>对时间是一次导数</li>
              <li>对空间是二次导数</li>
            </ul>
            <p>即同时出现 $\frac{\partial \psi}{\partial t}$ 和 $\nabla^2\psi$。</p>
            <p>时间与空间的微分阶数不对称。这种时间、空间处理方式的不对称，说明薛定谔方程<strong>不能满足相对论协变性的要求</strong>，因此它本质上是一个<strong>非相对论方程</strong>。</p>
            <p><strong>物理含义：</strong>它适用于低速粒子、非相对论范围、不需要严格满足狭义相对论时空对称性的情形。而当粒子速度接近光速时，就不能再单独使用普通薛定谔方程，而要转向相对论量子力学方程，如 Klein-Gordon 方程、Dirac 方程等。</p>
          </div>

          <div class="note-block">
            <h4 class="step-heading">性质3：薛定谔方程是线性方程</h4>
            <p>若 $\psi_1,\psi_2$ 都满足薛定谔方程，那么它们的线性组合</p>
            <p class="formula-center">$$\psi=c_1\psi_1+c_2\psi_2$$</p>
            <p>仍然满足薛定谔方程。也就是说：一个解加上另一个解，仍然还是方程的解。</p>
            <p>这就是薛定谔方程的<strong>线性性</strong>。</p>
            <p>线性性对应量子力学中的<strong>态叠加原理</strong>：</p>
            <ul class="styled-list">
              <li>若两个态都可能存在</li>
              <li>那么它们的线性叠加态也可能存在</li>
            </ul>
            <p>这正是量子干涉、量子叠加等现象的数学基础。</p>
          </div>

          <div class="note-block">
            <h4 class="step-heading">性质4：线性方程不包含经典意义下的混沌运动</h4>
            <p>由于薛定谔方程是线性的，所以它<strong>不包含经典非线性动力学系统那种由方程本身产生的混沌运动</strong>。</p>
            <p>经典混沌通常依赖于：</p>
            <ul class="styled-list">
              <li>非线性方程</li>
              <li>对初值的极端敏感性</li>
              <li>相空间轨道的复杂缠绕</li>
            </ul>
            <p>而标准薛定谔方程本身是线性的，因此不会像经典非线性方程那样，直接产生那种"由动力学方程本身导致的混沌"。</p>
            <p><strong>注意：</strong>这里说"不包含混沌运动"，是指<strong>标准线性薛定谔方程本身</strong>不表现为经典那类非线性混沌方程。并不是说量子系统永远"不复杂"。量子系统依然可能表现出非常复杂的谱结构、干涉结构和统计行为，只是其复杂性来源与经典混沌不完全相同。</p>
          </div>
        </div>

        <h2 id="sec7" class="section-heading">7. 定态薛定谔方程</h2>

        <div class="content-section">
          <p>当势能只与空间坐标有关而不显含时间时，</p>
          <p class="formula-center">$$V = V(\mathbf r)$$</p>

          <p>含时薛定谔方程可写为</p>
          <p class="formula-center">$$i\hbar \frac{\partial \Psi(\mathbf r,t)}{\partial t} = \left[ -\frac{\hbar^2}{2m}\nabla^2 + V(\mathbf r) \right]\Psi(\mathbf r,t)$$</p>

          <p>由于势能中不含时间变量，可以尝试用分离变数法求解。</p>

          <h4 class="step-heading">设总波函数可以写成空间部分与时间部分的乘积：</h4>
          <p class="formula-center">$$\Psi(\mathbf r,t)=\psi(\mathbf r)T(t)$$</p>

          <p>其中：</p>
          <ul class="styled-list">
            <li>$\psi(\mathbf r)$ 只依赖空间坐标</li>
            <li>$T(t)$ 只依赖时间</li>
          </ul>

          <h4 class="step-heading">分离时间变量与空间变量</h4>
          <p>两边同时除以 $\psi(\mathbf r)T(t)$，得到</p>
          <p class="formula-center">$$i\hbar \frac{1}{T}\frac{dT}{dt} = -\frac{\hbar^2}{2m}\frac{1}{\psi}\nabla^2\psi + V(\mathbf r)$$</p>

          <p>注意到：</p>
          <ul class="styled-list">
            <li>左边只依赖于 $t$</li>
            <li>右边只依赖于 $\mathbf r$</li>
          </ul>

          <p>由于它们对任意 $\mathbf r,t$ 都恒相等，所以只能都等于同一个常数。记这个常数为 $E$（其具有能量的量纲），则有</p>
          <p class="formula-center">$$i\hbar \frac{1}{T}\frac{dT}{dt}=E$$</p>
          <p class="formula-center">$$-\frac{\hbar^2}{2m}\frac{1}{\psi}\nabla^2\psi + V(\mathbf r)=E$$</p>

          <p>其中常数 $E$ 后来将被解释为体系的能量。</p>

          <h4 class="step-heading">时间部分方程及其解</h4>
          <p>时间部分满足</p>
          <p class="formula-center">$$i\hbar \frac{dT}{dt}=ET$$</p>
          <p>改写为</p>
          <p class="formula-center">$$\frac{dT}{dt}=-\frac{iE}{\hbar}T$$</p>
          <p>这是一个一阶常微分方程，其解为</p>
          <p class="formula-center">$$T(t)=e^{-iEt/\hbar}$$</p>

          <h4 class="step-heading">空间部分方程（定态薛定谔方程）</h4>
          <p>空间部分满足</p>
          <p class="formula-center">$$-\frac{\hbar^2}{2m}\frac{1}{\psi}\nabla^2\psi + V(\mathbf r)=E$$</p>
          <p>两边乘以 $\psi(\mathbf r)$，得</p>
          <p class="formula-center">$$\left[ -\frac{\hbar^2}{2m}\nabla^2 + V(\mathbf r) \right]\psi(\mathbf r)=E\psi(\mathbf r)$$</p>

          <p>这就是<span class="highlight">定态薛定谔方程</span>，也叫不含时薛定谔方程。</p>

          <p>若记哈密顿算符为</p>
          <p class="formula-center">$$\hat H = -\frac{\hbar^2}{2m}\nabla^2 + V(\mathbf r)$$</p>
          <p>则上式可写为</p>
          <p class="formula-center">$$\hat H \psi(\mathbf r)=E\psi(\mathbf r)$$</p>

          <p>这说明定态问题本质上是哈密顿算符的本征值问题：</p>
          <ul class="styled-list">
            <li>$\psi(\mathbf r)$ 是能量本征函数</li>
            <li>$E$ 是能量本征值</li>
          </ul>

          <h4 class="step-heading">定态解的最终形式</h4>
          <p>把空间部分和时间部分合起来，总波函数为</p>
          <p class="formula-center">$$\Psi(\mathbf r,t)=\psi(\mathbf r)e^{-iEt/\hbar}$$</p>

          <p>这就是当 $V(\mathbf r)$ 不含时间时，薛定谔方程的定态解。</p>
          <p>若能量本征值是离散的，常写成</p>
          <p class="formula-center">$$\Psi_n(\mathbf r,t)=\psi_n(\mathbf r)e^{-iE_n t/\hbar}$$</p>

          <h4 class="step-heading">为什么叫"定态"</h4>
          <p>对于定态解 $\Psi(\mathbf r,t)=\psi(\mathbf r)e^{-iEt/\hbar}$，其概率密度为</p>
          <p class="formula-center">$$|\Psi(\mathbf r,t)|^2 = |\psi(\mathbf r)|^2$$</p>

          <p>因为 $\left|e^{-iEt/\hbar}\right|^2=1$。</p>

          <p>可见概率密度与时间无关。</p>

          <p>这就是"定态"名称的来源：虽然波函数本身随时间变化，但只多了一个相位因子，所有由模平方决定的概率分布都不随时间改变。</p>

          <div class="note-block note-important">
            <h4 class="step-heading">定态特征（考试要点）</h4>
            <p class="formula-center">$$|\Psi(\mathbf r,t)|^2=|\psi(\mathbf r)|^2$$</p>
            <p><strong>即概率密度不随时间变化。</strong></p>
          </div>
        </div>

      </div>

      <div class="note-footer">
        <a href="../notes.html" class="back-link">← 返回 NOTES</a>
      </div>

    </div>
  </main>
